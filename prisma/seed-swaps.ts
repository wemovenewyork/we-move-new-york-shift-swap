import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

const ROUTES = [
  "B1","B2","B4","B6","B7","B8","B11","B12","B13","B15","B17","B20","B25","B26","B31","B35","B36","B38","B41","B42","B43","B44","B44-SBS","B45","B46","B46-SBS","B47","B48","B49","B52","B54","B57","B60","B61","B62","B63","B65","B67","B68","B69","B70","B82","B82-SBS","B83","B84","B103",
  "Bx1","Bx2","Bx4","Bx5","Bx6","Bx7","Bx8","Bx9","Bx10","Bx11","Bx12","Bx12-SBS","Bx13","Bx15","Bx16","Bx17","Bx19","Bx20","Bx22","Bx23","Bx24","Bx25","Bx26","Bx27","Bx28","Bx29","Bx30","Bx31","Bx32","Bx33","Bx34","Bx35","Bx36","Bx38","Bx39","Bx40","Bx41","Bx42",
  "M1","M2","M3","M4","M5","M7","M8","M9","M10","M11","M14A","M14D","M15","M15-SBS","M20","M21","M22","M23-SBS","M31","M34","M34A-SBS","M35","M42","M50","M57","M60-SBS","M66","M72","M79-SBS","M86-SBS","M96","M101","M102","M103","M104","M106","M116",
  "Q1","Q2","Q3","Q4","Q5","Q6","Q7","Q8","Q9","Q10","Q11","Q12","Q13","Q15","Q16","Q17","Q18","Q19","Q20A","Q21","Q22","Q23","Q24","Q25","Q26","Q27","Q28","Q29","Q30","Q31","Q32","Q33","Q34","Q36","Q37","Q38","Q39","Q40","Q41","Q42","Q43","Q44","Q44-SBS","Q46","Q47","Q48","Q49","Q52-SBS","Q53-SBS","Q54","Q55","Q56","Q58","Q59","Q60","Q64","Q65","Q66","Q67","Q69","Q70-SBS","Q72","Q76","Q83","Q84","Q85","Q88","Q100","Q101","Q102","Q103","Q104","Q110","Q112","Q113",
  "S40","S42","S44","S46","S48","S51","S52","S53","S54","S55","S56","S57","S59","S61","S62","S66","S74","S76","S78","S79-SBS","S81","S84","S86","S87","S88","S89","S90","S91","S93","S94","S96","S98",
];

const WORK_DETAILS = [
  "Looking to swap this AM piece. Great route, I just need to adjust my schedule this week.",
  "Split shift available — solid layovers, clean bus assignment. Looking for a straight piece.",
  "Early bird run. Works great if you live in the area. Open to any comparable trade.",
  "PM piece on a busy corridor. Easy terminals, consistent traffic. Need a morning instead.",
  "Night piece available. Looking for anything during daylight hours.",
  "Express run along the highway. Low stress, good recovery time. Open to a local trade.",
  "SBS piece — quick boarding, smooth ride. Looking for any comparable straight run.",
  "Mid-day piece with solid breaks. Perfect for someone with school pickup later. Flexible on trade.",
  "Short piece, clears early. Great if you need the afternoon free. Looking for later start.",
  "Reliable route with consistent ridership. Just need a different day this pay period.",
  "Weekend piece available — looking for a weekday in exchange.",
  "This is a good piece. Supervisor approved the swap, just need a willing partner.",
  "Comfortable run, mostly straight shots. Need Monday specifically — willing to take anything.",
  "Afternoon piece with manageable traffic. Looking for earlier start time.",
  "Overnight run — decent pay, quiet streets. Looking for a day piece trade.",
  "Solid piece on one of the busier routes. Just need to shift my day off this week.",
  "Good mid-route piece. Looking for something in similar hours. Flexible.",
  "AM rush piece on a major corridor. High ridership but smooth operation. Looking to swap day.",
  "Comfortable piece — mostly flat terrain, AC bus. Looking for similar or later run.",
  "Standard piece, nothing fancy. Just need to trade for personal reasons this cycle.",
];

const DAYSOFF_DETAILS = [
  "Have a doctor's appointment I can't reschedule. Need this day guaranteed. Will take your day.",
  "My kid's graduation ceremony is that day. Been planning for months. Any trade works.",
  "Moving to a new apartment. Just need the one day. Flexible on what I pick up.",
  "Court date scheduled. Cannot be moved. Will happily take your day off in exchange.",
  "Religious observance. Need this specific day. Respectfully requesting a trade.",
  "Family member flying in from out of state. Need to pick them up. Any trade works.",
  "Anniversary trip — hotel and plans already booked. Need this day off.",
  "Car registration appointment — only available that day. Quick trade needed.",
  "Union meeting I have to attend. Need this morning free. Happy to take your day.",
  "Medical procedure — outpatient, but need the day off to recover.",
  "My spouse has that day off and it's the only time we can handle something together.",
  "School event for my kids — teacher conference I can't miss. Any day in trade.",
  "Just need a long weekend this one time. Trading my Friday for your Monday.",
  "Immigration appointment that took months to schedule. Cannot miss. Will take any day.",
  "Birthday plans that got locked in early. Willing to work any other day.",
  "Funeral service for a family friend. Need this day off. Any swap appreciated.",
  "Dealing with a home repair that requires me to be there all day. One-time ask.",
  "I have Saturday off and would love a Wednesday instead — easier for errands.",
  "Need Monday off to extend a vacation. Happy to take your Sunday or any weekday.",
  "Childcare fell through for that specific day. Any swap with notice works for me.",
];

const VACATION_DETAILS = [
  "Booked a cruise and need to move my vacation week. Flexible on which week I take.",
  "Family reunion is that specific week — relatives flying in from across the country.",
  "Got a great travel deal for that week. Happy to trade for any nearby week.",
  "My kids are off school that week. Need to be home. Will take your week instead.",
  "Surgery scheduled for that week. Need time to recover. Looking to swap with any week.",
  "Religious holiday falls that week and I need the full week off. Will trade.",
  "Visiting family abroad. Flight booked. Need this week specifically.",
  "Hotel and itinerary locked in. Just need the right week to align.",
  "My spouse's vacation is that week — we want to travel together.",
  "Need a summer week instead of what I got. Open to any swap.",
  "Trying to coordinate with another family member who has Week 26. Will trade.",
  "Got an early pick and need to adjust. Any comparable week works for me.",
  "Taking kids on their first trip. Want a summer week. Will give up my fall week.",
  "Winter vacation planned — need a week in December. Trading my spring week.",
  "Spring break aligns with that week. Kids are out of school. Perfect timing.",
  "Long weekend turned into a full week. Want to lock it in properly via official swap.",
  "Just ended up with a week that doesn't work for my schedule. Looking to trade.",
  "Destination wedding — need that specific week. Willing to negotiate.",
  "Rescheduled week due to personal emergency last year. Finally sorting it out.",
  "Want Week 1 to start the new year fresh. Trading whatever week I have.",
];

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function padTime(h: number, m: number): string { return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`; }
function futureDate(daysAhead: number): Date { const d = new Date(); d.setDate(d.getDate() + daysAhead); return d; }

async function main() {
  console.log("Fetching users...");
  const users = await prisma.user.findMany({
    where: { email: { endsWith: "@mta.com" }, NOT: { email: "system@wemoveny.internal" }, depotId: { not: null } },
    select: { id: true, depotId: true, firstName: true, lastName: true },
  });
  console.log(`Found ${users.length} operators`);

  // Remove stale open/pending non-vacation swaps that may have old dates
  const deleted = await prisma.swap.deleteMany({
    where: {
      status: { in: ["open", "pending"] },
      details: { not: "Historical" },
      category: { in: ["work", "daysoff"] },
    },
  });
  console.log(`Cleared ${deleted.count} old work/daysoff swaps`);

  // Also clear vacation swaps to rebalance
  const deletedVac = await prisma.swap.deleteMany({
    where: { status: { in: ["open", "pending"] }, details: { not: "Historical" }, category: "vacation" },
  });
  console.log(`Cleared ${deletedVac.count} old vacation swaps`);

  const statuses: Array<"open"|"pending"|"filled"> = ["open","open","open","open","open","pending","pending","filled"];

  // ── WORK SWAPS: 80 ──────────────────────────────────────────────
  console.log("Creating 80 work swaps...");
  for (let i = 0; i < 80; i++) {
    const u = rand(users);
    const startH = randInt(4, 20);
    const clearH = (startH + randInt(7, 9)) % 24;
    const hasSwing = Math.random() < 0.25;
    const swingStartH = (startH + randInt(2, 3)) % 24;
    const status = rand(statuses);
    await prisma.swap.create({
      data: {
        userId: u.id,
        depotId: u.depotId!,
        category: "work",
        status,
        posterName: `${u.firstName} ${u.lastName}`,
        details: rand(WORK_DETAILS),
        run: `R${randInt(1,999).toString().padStart(3,"0")}`,
        route: rand(ROUTES),
        startTime: padTime(startH, [0,15,30,45][randInt(0,3)]),
        clearTime: padTime(clearH, [0,15,30,45][randInt(0,3)]),
        swingStart: hasSwing ? padTime(swingStartH, 0) : null,
        swingEnd: hasSwing ? padTime((swingStartH + 1) % 24, 30) : null,
        contact: Math.random() < 0.55 ? `${rand(["718","347","929","646","212"])}-555-${randInt(1000,9999)}` : null,
        date: futureDate(randInt(7, 90)),
      },
    });
  }

  // ── DAYS OFF SWAPS: 60 ──────────────────────────────────────────
  console.log("Creating 60 days-off swaps...");
  for (let i = 0; i < 60; i++) {
    const u = rand(users);
    const fromIdx = randInt(0, 6);
    let toIdx = randInt(0, 6);
    while (toIdx === fromIdx) toIdx = randInt(0, 6);
    const fromDate = futureDate(randInt(7, 60));
    const toDate = futureDate(randInt(7, 60));
    const status = rand(statuses);
    await prisma.swap.create({
      data: {
        userId: u.id,
        depotId: u.depotId!,
        category: "daysoff",
        status,
        posterName: `${u.firstName} ${u.lastName}`,
        details: rand(DAYSOFF_DETAILS),
        fromDay: DAYS[fromIdx],
        toDay: DAYS[toIdx],
        fromDate,
        toDate,
        date: fromDate,
      },
    });
  }

  // ── VACATION SWAPS: 50 ──────────────────────────────────────────
  console.log("Creating 50 vacation swaps...");
  for (let i = 0; i < 50; i++) {
    const u = rand(users);
    const haveWeek = randInt(1, 52);
    let wantWeek = randInt(1, 52);
    while (wantWeek === haveWeek) wantWeek = randInt(1, 52);
    await prisma.swap.create({
      data: {
        userId: u.id,
        depotId: u.depotId!,
        category: "vacation",
        status: rand(["open","open","open","open","pending"] as const),
        posterName: `${u.firstName} ${u.lastName}`,
        details: rand(VACATION_DETAILS),
        vacationHave: `Week ${haveWeek}`,
        vacationWant: `Week ${wantWeek}`,
        date: futureDate(randInt(14, 180)),
      },
    });
  }

  // Final tally
  const counts = await prisma.swap.groupBy({
    by: ["category","status"],
    where: { status: { in: ["open","pending"] }, details: { not: "Historical" } },
    _count: true,
    orderBy: { category: "asc" },
  });
  console.log("\nActive swaps by category:");
  console.table(counts);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
