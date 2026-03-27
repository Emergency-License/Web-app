import { NextRequest, NextResponse } from "next/server";

// DPS API service type IDs
const SERVICE_TYPE_IDS: Record<string, number> = {
  renewal: 71,
  new: 81,
  id: 15,
  cdl: 170,
  permit: 78,
  change: 72,
};

/**
 * Session Manager URL — the Playwright service that holds authenticated
 * DPS sessions. Set via env var in production (points to the VPS).
 * Falls back to localhost for local dev.
 */
const SESSION_API = process.env.SESSION_MANAGER_URL || "http://127.0.0.1:8100";

type DPSLocation = {
  Id: number;
  Name: string;
  Address: string;
  City: string;
  State: string;
  Zip: string;
  Distance: number;
  NextAvailableDate: string;
  FirstAvailableDate?: string;
};

type DPSDateSlot = {
  AvailableDate: string;
  AvailableTimeSlots?: { StartDateTime: string }[];
};

/**
 * Call the DPS API through the Session Manager's authenticated browser.
 * Returns null if the session manager is down or the call fails.
 */
async function callDPSApi(endpoint: string, payload: object): Promise<unknown | null> {
  try {
    const resp = await fetch(`${SESSION_API}/api-call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint, payload }),
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return null;
    const result = await resp.json();
    if (result.error) return null;
    return result.data ?? result;
  } catch {
    return null;
  }
}

/**
 * Check if the Session Manager is running and has a healthy session.
 */
async function isSessionManagerHealthy(): Promise<boolean> {
  try {
    const resp = await fetch(`${SESSION_API}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    return data.status === "ok" && data.authenticated === true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zipCode, maxDistance, service } = body;

    if (!zipCode || !/^\d{5}$/.test(zipCode)) {
      return NextResponse.json({ error: "Invalid zip code" }, { status: 400 });
    }

    const typeId = SERVICE_TYPE_IDS[service] || 71;
    const maxDist = Math.min(Number(maxDistance) || 50, 250);

    // Try the real DPS API through the Session Manager
    const sessionHealthy = await isSessionManagerHealthy();

    if (sessionHealthy) {
      const liveResult = await fetchLiveAvailability(zipCode, typeId, maxDist, service);
      if (liveResult) {
        return NextResponse.json(liveResult);
      }
    }

    // Session Manager not running or call failed — return demo data
    return NextResponse.json({
      slots: getDemoSlots(zipCode, maxDist),
      source: "demo",
      message: sessionHealthy
        ? "Live search returned no results. Showing sample data."
        : "Live monitoring is starting up. Showing sample data for now.",
    });
  } catch (error) {
    console.error("Availability check failed:", error);
    return NextResponse.json(
      { error: "Failed to check availability" },
      { status: 500 }
    );
  }
}

/**
 * Fetch real availability from the DPS API via the Session Manager.
 * Returns formatted response or null on failure.
 */
async function fetchLiveAvailability(
  zipCode: string,
  typeId: number,
  maxDist: number,
  service: string
) {
  // Step 1: Get available locations
  const locData = await callDPSApi("AvailableLocation", {
    TypeId: typeId,
    ZipCode: zipCode,
    CityName: "",
    PreferredDay: 0,
  });

  if (!locData) return null;

  // Parse locations — API returns either an array or {Locations: [...]}
  let locations: DPSLocation[] = [];
  if (Array.isArray(locData)) {
    locations = locData;
  } else if (typeof locData === "object" && locData !== null) {
    const obj = locData as Record<string, unknown>;
    locations = (obj.Locations ?? obj.locations ?? []) as DPSLocation[];
  }

  if (locations.length === 0) return null;

  // Filter by max distance
  const nearby = locations.filter((loc) => loc.Distance <= maxDist);

  if (nearby.length === 0) {
    return { slots: [], source: "live" };
  }

  // Step 2: Get detailed dates for top 10 locations
  const slots = await Promise.all(
    nearby.slice(0, 10).map(async (loc) => {
      let times: string[] = [];

      // Fetch time slots for this location
      const dateData = await callDPSApi("AvailableLocationDates", {
        LocationId: loc.Id,
        TypeId: typeId,
        SameDay: false,
        StartDate: null,
        PreferredDay: 0,
      });

      if (dateData && typeof dateData === "object") {
        const dateObj = dateData as Record<string, unknown>;
        const dateSlots: DPSDateSlot[] = (
          dateObj.LocationAvailabilityDates ??
          dateObj.AvailableDates ??
          []
        ) as DPSDateSlot[];

        if (dateSlots.length > 0 && dateSlots[0].AvailableTimeSlots) {
          times = dateSlots[0].AvailableTimeSlots.map((s) => {
            const d = new Date(s.StartDateTime);
            return d.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });
          });
        }
      }

      const nextDate = loc.NextAvailableDate || loc.FirstAvailableDate || "";
      const formattedDate = nextDate
        ? new Date(nextDate).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })
        : "";

      return {
        id: String(loc.Id),
        locationName: loc.Name,
        address: `${loc.Address}, ${loc.City}, TX ${loc.Zip}`,
        distance: Math.round(loc.Distance * 10) / 10,
        date: formattedDate,
        times,
        serviceType: service,
      };
    })
  );

  const validSlots = slots.filter((s) => s.date !== "");
  return {
    slots: validSlots,
    source: "live",
    count: validSlots.length,
  };
}

/**
 * Texas zip code to region mapping.
 * Maps the first 3 digits of a zip to a metro region so demo data
 * shows offices near the user, not random Dallas locations.
 */
type Region = "austin" | "dallas" | "houston" | "sanantonio" | "other";

function getRegion(zipCode: string): Region {
  const prefix = zipCode.slice(0, 3);
  const prefixNum = parseInt(prefix, 10);

  // Austin / Central Texas: 786-789, 765 (Waco area)
  if ((prefixNum >= 786 && prefixNum <= 789) || prefixNum === 765) return "austin";
  // Dallas / North Texas: 750-759, 760-764, 766-769
  if (prefixNum >= 750 && prefixNum <= 769) return "dallas";
  // Houston / Southeast Texas: 770-779
  if (prefixNum >= 770 && prefixNum <= 779) return "houston";
  // San Antonio / South Texas: 780-785, 789
  if (prefixNum >= 780 && prefixNum <= 785) return "sanantonio";

  return "other";
}

type DemoLocation = {
  id: string;
  locationName: string;
  address: string;
  distance: number;
  date: string;
  times: string[];
  serviceType: string;
};

const DEMO_LOCATIONS: Record<Region, DemoLocation[]> = {
  austin: [
    {
      id: "demo-a1",
      locationName: "Georgetown DPS",
      address: "810 S Main St, Georgetown, TX 78626",
      distance: 5,
      date: getNextWeekday(2),
      times: ["9:00 AM", "10:30 AM", "2:15 PM"],
      serviceType: "renewal",
    },
    {
      id: "demo-a2",
      locationName: "Cedar Park DPS",
      address: "930 S Bell Blvd, Cedar Park, TX 78613",
      distance: 12,
      date: getNextWeekday(1),
      times: ["8:30 AM", "9:15 AM", "11:00 AM", "3:00 PM"],
      serviceType: "renewal",
    },
    {
      id: "demo-a3",
      locationName: "Austin North Mega Center",
      address: "6121 N Lamar Blvd, Austin, TX 78752",
      distance: 28,
      date: getNextWeekday(0),
      times: ["8:00 AM", "9:00 AM", "10:45 AM", "1:30 PM", "3:45 PM"],
      serviceType: "renewal",
    },
    {
      id: "demo-a4",
      locationName: "Austin South Mega Center",
      address: "5805 S Pleasant Valley Rd, Austin, TX 78744",
      distance: 38,
      date: getNextWeekday(1),
      times: ["8:15 AM", "10:00 AM", "2:30 PM", "4:00 PM"],
      serviceType: "renewal",
    },
    {
      id: "demo-a5",
      locationName: "Temple DPS",
      address: "602 N General Bruce Dr, Temple, TX 76504",
      distance: 42,
      date: getNextWeekday(0),
      times: ["8:00 AM", "8:30 AM", "9:00 AM", "10:15 AM", "1:30 PM", "2:00 PM", "3:30 PM"],
      serviceType: "renewal",
    },
    {
      id: "demo-a6",
      locationName: "San Marcos DPS",
      address: "2300 IH 35 S, San Marcos, TX 78666",
      distance: 65,
      date: getNextWeekday(2),
      times: ["9:30 AM", "11:00 AM"],
      serviceType: "renewal",
    },
    {
      id: "demo-a7",
      locationName: "Waco Mega Center",
      address: "1901 S New Rd, Waco, TX 76711",
      distance: 85,
      date: getNextWeekday(1),
      times: ["8:15 AM", "10:45 AM", "1:00 PM", "2:30 PM", "3:45 PM", "4:30 PM"],
      serviceType: "renewal",
    },
    {
      id: "demo-a8",
      locationName: "Killeen DPS",
      address: "701 W Central Texas Expy, Killeen, TX 76541",
      distance: 55,
      date: getNextWeekday(3),
      times: ["8:00 AM", "11:30 AM", "3:00 PM"],
      serviceType: "renewal",
    },
  ],
  dallas: [
    {
      id: "demo-d1",
      locationName: "Garland Mega Center",
      address: "4445 Saturn Rd Suite A, Garland, TX 75041",
      distance: 12,
      date: getNextWeekday(2),
      times: ["8:30 AM", "9:15 AM", "10:00 AM", "2:45 PM"],
      serviceType: "renewal",
    },
    {
      id: "demo-d2",
      locationName: "Carrollton DPS",
      address: "2625 Old Denton Rd Suite 200, Carrollton, TX 75007",
      distance: 18,
      date: getNextWeekday(3),
      times: ["10:30 AM", "1:15 PM"],
      serviceType: "renewal",
    },
    {
      id: "demo-d3",
      locationName: "McKinney DPS",
      address: "1890 N Central Expy Suite 100, McKinney, TX 75070",
      distance: 35,
      date: getNextWeekday(1),
      times: ["8:00 AM", "9:00 AM", "11:30 AM", "3:00 PM", "4:15 PM"],
      serviceType: "renewal",
    },
    {
      id: "demo-d4",
      locationName: "Fort Worth DPS",
      address: "2501 SE Loop 820, Fort Worth, TX 76140",
      distance: 45,
      date: getNextWeekday(0),
      times: ["8:00 AM", "10:30 AM", "1:00 PM", "3:30 PM"],
      serviceType: "renewal",
    },
    {
      id: "demo-d5",
      locationName: "Denton DPS",
      address: "1011 Ector St, Denton, TX 76201",
      distance: 50,
      date: getNextWeekday(2),
      times: ["9:00 AM", "11:00 AM", "2:00 PM"],
      serviceType: "renewal",
    },
    {
      id: "demo-d6",
      locationName: "Waco Mega Center",
      address: "1901 S New Rd, Waco, TX 76711",
      distance: 96,
      date: getNextWeekday(1),
      times: ["8:15 AM", "10:45 AM", "1:00 PM", "2:30 PM", "3:45 PM", "4:30 PM"],
      serviceType: "renewal",
    },
  ],
  houston: [
    {
      id: "demo-h1",
      locationName: "Spring Mega Center",
      address: "505 Spring Hill Dr, Spring, TX 77386",
      distance: 10,
      date: getNextWeekday(1),
      times: ["8:00 AM", "9:30 AM", "11:00 AM", "2:00 PM"],
      serviceType: "renewal",
    },
    {
      id: "demo-h2",
      locationName: "Rosenberg Mega Center",
      address: "28616 Southwest Fwy, Rosenberg, TX 77471",
      distance: 22,
      date: getNextWeekday(2),
      times: ["8:30 AM", "10:00 AM", "1:15 PM", "3:45 PM"],
      serviceType: "renewal",
    },
    {
      id: "demo-h3",
      locationName: "Baytown DPS",
      address: "5721 Garth Rd, Baytown, TX 77521",
      distance: 30,
      date: getNextWeekday(0),
      times: ["8:00 AM", "9:00 AM", "10:30 AM", "2:15 PM", "4:00 PM"],
      serviceType: "renewal",
    },
    {
      id: "demo-h4",
      locationName: "Conroe DPS",
      address: "2015 N Frazier St, Conroe, TX 77303",
      distance: 40,
      date: getNextWeekday(1),
      times: ["8:15 AM", "11:00 AM", "1:30 PM"],
      serviceType: "renewal",
    },
    {
      id: "demo-h5",
      locationName: "Huntsville DPS",
      address: "232 Hwy 75 N, Huntsville, TX 77320",
      distance: 72,
      date: getNextWeekday(0),
      times: ["8:00 AM", "8:30 AM", "9:00 AM", "10:15 AM", "1:30 PM", "2:00 PM"],
      serviceType: "renewal",
    },
  ],
  sanantonio: [
    {
      id: "demo-s1",
      locationName: "San Antonio Mega Center",
      address: "307 Sidney Baker S, Kerrville, TX 78028",
      distance: 8,
      date: getNextWeekday(1),
      times: ["8:30 AM", "10:00 AM", "11:30 AM", "2:00 PM"],
      serviceType: "renewal",
    },
    {
      id: "demo-s2",
      locationName: "New Braunfels DPS",
      address: "1679 IH 35 S, New Braunfels, TX 78130",
      distance: 32,
      date: getNextWeekday(2),
      times: ["9:00 AM", "10:30 AM", "1:15 PM", "3:00 PM"],
      serviceType: "renewal",
    },
    {
      id: "demo-s3",
      locationName: "San Marcos DPS",
      address: "2300 IH 35 S, San Marcos, TX 78666",
      distance: 50,
      date: getNextWeekday(0),
      times: ["8:00 AM", "9:30 AM", "11:00 AM", "2:30 PM"],
      serviceType: "renewal",
    },
    {
      id: "demo-s4",
      locationName: "Seguin DPS",
      address: "1565 E Court St, Seguin, TX 78155",
      distance: 38,
      date: getNextWeekday(1),
      times: ["8:00 AM", "10:45 AM", "1:00 PM"],
      serviceType: "renewal",
    },
  ],
  other: [
    {
      id: "demo-o1",
      locationName: "Nearest DPS Office",
      address: "Texas DPS Office",
      distance: 15,
      date: getNextWeekday(1),
      times: ["8:30 AM", "10:00 AM", "1:30 PM", "3:00 PM"],
      serviceType: "renewal",
    },
    {
      id: "demo-o2",
      locationName: "Regional DPS Mega Center",
      address: "Texas DPS Mega Center",
      distance: 45,
      date: getNextWeekday(0),
      times: ["8:00 AM", "9:00 AM", "10:30 AM", "11:30 AM", "2:00 PM", "3:30 PM"],
      serviceType: "renewal",
    },
    {
      id: "demo-o3",
      locationName: "County DPS Office",
      address: "Texas DPS Office",
      distance: 75,
      date: getNextWeekday(2),
      times: ["9:00 AM", "11:00 AM"],
      serviceType: "renewal",
    },
  ],
};

/**
 * Demo data for when the DPS API is not yet authenticated.
 * Shows realistic results based on the user's zip code region.
 */
function getDemoSlots(zipCode: string, maxDistance: number) {
  const region = getRegion(zipCode);
  const locations = DEMO_LOCATIONS[region] || DEMO_LOCATIONS.other;
  return locations.filter((loc) => loc.distance <= maxDistance);
}

function getNextWeekday(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead + 1);
  // Skip weekends
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
