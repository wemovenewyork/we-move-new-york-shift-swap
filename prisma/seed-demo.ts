import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const USERS = [
  { email: "marcus.johnson@mta.com", firstName: "Marcus", lastName: "Johnson", depotCode: "FB", completed: 18, cancelled: 1, noShow: 0, avgRating: 4.9 },
  { email: "diana.reyes@mta.com", firstName: "Diana", lastName: "Reyes", depotCode: "JA", completed: 24, cancelled: 2, noShow: 0, avgRating: 4.8 },
  { email: "kevin.williams@mta.com", firstName: "Kevin", lastName: "Williams", depotCode: "GH", completed: 7, cancelled: 1, noShow: 1, avgRating: 4.2 },
  { email: "patricia.brown@mta.com", firstName: "Patricia", lastName: "Brown", depotCode: "QV", completed: 31, cancelled: 0, noShow: 0, avgRating: 5.0 },
  { email: "darnell.thomas@mta.com", firstName: "Darnell", lastName: "Thomas", depotCode: "EN", completed: 3, cancelled: 0, noShow: 0, avgRating: 4.5 },
  { email: "shanice.davis@mta.com", firstName: "Shanice", lastName: "Davis", depotCode: "TA", completed: 14, cancelled: 3, noShow: 0, avgRating: 4.6 },
  { email: "robert.carter@mta.com", firstName: "Robert", lastName: "Carter", depotCode: "WF", completed: 9, cancelled: 1, noShow: 0, avgRating: 4.7 },
  { email: "latoya.harris@mta.com", firstName: "Latoya", lastName: "Harris", depotCode: "UP", completed: 0, cancelled: 0, noShow: 0, avgRating: 5.0 },
  { email: "james.robinson@mta.com", firstName: "James", lastName: "Robinson", depotCode: "MQ", completed: 22, cancelled: 2, noShow: 1, avgRating: 4.5 },
  { email: "michelle.clark@mta.com", firstName: "Michelle", lastName: "Clark", depotCode: "SC", completed: 11, cancelled: 0, noShow: 0, avgRating: 4.8 },
  { email: "anthony.lewis@mta.com", firstName: "Anthony", lastName: "Lewis", depotCode: "KB", completed: 5, cancelled: 2, noShow: 0, avgRating: 4.3 },
  { email: "brenda.walker@mta.com", firstName: "Brenda", lastName: "Walker", depotCode: "MC", completed: 16, cancelled: 1, noShow: 0, avgRating: 4.7 },
];

const WORK_SWAPS = [
  { run: "R101", route: "B41", startTime: "05:00", clearTime: "13:30", details: "Looking to swap this early AM run. Great route, just need a different day off this week.", contact: "646-555-0101" },
  { run: "R204", route: "Bx12", startTime: "06:30", clearTime: "15:00", swingStart: "10:00", swingEnd: "11:30", details: "Split shift on the Bx12. Works great if you live in the Bronx. Looking to pick up a later piece.", contact: "718-555-0202" },
  { run: "R007", route: "Q44", startTime: "14:00", clearTime: "22:30", details: "PM piece on the Q44 Select Bus. Easy route, AC bus. Need morning instead for a family event.", contact: "347-555-0303" },
  { run: "R318", route: "B46", startTime: "07:15", clearTime: "15:45", details: "Solid AM piece on the B46. Ends at Flatbush Ave. Open to any comparable run.", contact: "718-555-0404" },
  { run: "R512", route: "M15-SBS", startTime: "09:00", clearTime: "17:30", details: "Mid-day piece on the M15 Select Bus Service. 1st Ave / 2nd Ave. Looking for earlier start.", contact: "212-555-0505" },
  { run: "R088", route: "S79-SBS", startTime: "06:00", clearTime: "14:00", details: "Early Staten Island Express SBS. Great piece, just need to attend a morning appointment next Tuesday.", contact: "718-555-0606" },
  { run: "R223", route: "Bx36", startTime: "15:30", clearTime: "00:00", details: "Night owl piece on the Bx36. Looking to swap for any AM or mid-day run.", contact: "929-555-0707" },
  { run: "R145", route: "B44-SBS", startTime: "07:00", clearTime: "15:00", details: "AM piece on the B44 SBS up Nostrand Ave. Reliable route, looking for similar or trade for days off.", contact: "718-555-0808" },
];

const DAYSOFF_SWAPS = [
  { fromDay: "Monday", toDay: "Wednesday", fromDate: "2026-04-06", toDate: "2026-04-08", details: "Need Monday off for a doctor's appointment. Will take your Wednesday no questions asked." },
  { fromDay: "Saturday", toDay: "Thursday", fromDate: "2026-04-11", toDate: "2026-04-09", details: "Have Saturday off, looking for a weekday. Any Thursday or Friday works." },
  { fromDay: "Sunday", toDay: "Friday", fromDate: "2026-04-12", toDate: "2026-04-10", details: "Trading my Sunday for a Friday. Great deal — get a full weekend!" },
  { fromDay: "Tuesday", toDay: "Saturday", fromDate: "2026-04-07", toDate: "2026-04-11", details: "Have Tuesday off, want Saturday. My kid's birthday is Saturday and I need to be there." },
  { fromDay: "Wednesday", toDay: "Monday", fromDate: "2026-04-08", toDate: "2026-04-06", details: "Looking to get Monday off for a long weekend. Trading my Wednesday." },
  { fromDay: "Friday", toDay: "Tuesday", fromDate: "2026-04-10", toDate: "2026-04-07", details: "Have Friday, need Tuesday. Routine schedule thing, flexible on week." },
];

const VACATION_SWAPS = [
  { vacationHave: "Week 22", vacationWant: "Week 26", details: "Have Week 22 (late May), looking for Week 26 (end of June). Family reunion planned." },
  { vacationHave: "Week 14", vacationWant: "Week 10", details: "Want Week 10 (early March) for a trip. Trading my Week 14 (early April)." },
  { vacationHave: "Week 34", vacationWant: "Week 30", details: "Have late August (Week 34). Want Week 30 (late July) instead for the kids' summer break." },
  { vacationHave: "Week 52", vacationWant: "Week 51", details: "Have the last week of the year, but need Week 51 (Christmas week) to be with family." },
  { vacationHave: "Week 18", vacationWant: "Week 20", details: "Trading Week 18 for Week 20. Just need the timing to work with a cruise booking." },
];

async function main() {
  console.log("Creating demo users...");
  const userMap: Record<string, string> = {};

  for (const u of USERS) {
    const depot = await prisma.depot.findUnique({ where: { code: u.depotCode } });
    const hash = await bcrypt.hash("password123", 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash: hash,
        firstName: u.firstName,
        lastName: u.lastName,
        depotId: depot?.id,
        verified: true,
      },
    });
    userMap[u.email] = user.id;

    // Reputation
    const total = u.completed + u.cancelled + u.noShow;
    await prisma.reputation.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, completed: u.completed, cancelled: u.cancelled, noShow: u.noShow },
    });

    // Reviews
    const existing = await prisma.review.count({ where: { reviewedId: user.id } });
    if (existing === 0 && u.completed > 0) {
      const fakeSwap = await prisma.swap.create({
        data: {
          userId: user.id,
          depotId: depot!.id,
          category: "work",
          status: "filled",
          details: "Historical swap",
          posterName: `${u.firstName} ${u.lastName}`,
          date: new Date("2025-01-01"),
        },
      });
      const reviewCount = Math.min(u.completed, 8);
      const baseRating = Math.round(u.avgRating);
      for (let i = 0; i < reviewCount; i++) {
        const rating = i % 5 === 0 && u.avgRating < 4.9 ? Math.max(3, baseRating - 1) : baseRating;
        await prisma.review.create({
          data: { swapId: fakeSwap.id, reviewerId: user.id, reviewedId: user.id, rating },
        });
      }
    }

    // Give each user 3 invite codes
    const codeCount = await prisma.inviteCode.count({ where: { createdBy: user.id } });
    if (codeCount === 0) {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      for (let i = 0; i < 3; i++) {
        let code = "WMNY-";
        for (let j = 0; j < 5; j++) code += chars[Math.floor(Math.random() * chars.length)];
        await prisma.inviteCode.create({ data: { code, createdBy: user.id } });
      }
    }

    console.log(`  Created ${u.firstName} ${u.lastName} (${u.depotCode})`);
  }

  console.log("Creating demo swaps...");
  const allUsers = await prisma.user.findMany({
    where: { email: { in: USERS.map(u => u.email) } },
    include: { depot: true },
  });

  let swapIdx = 0;

  // Work swaps
  for (const ws of WORK_SWAPS) {
    const user = allUsers[swapIdx % allUsers.length];
    const daysFromNow = (swapIdx * 2) + 1;
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    const status = swapIdx < 2 ? "open" : swapIdx < 5 ? "open" : swapIdx < 7 ? "pending" : "filled";
    await prisma.swap.create({
      data: {
        userId: user.id,
        depotId: user.depot!.id,
        category: "work",
        status,
        posterName: `${user.firstName} ${user.lastName}`,
        details: ws.details,
        contact: ws.contact,
        run: ws.run,
        route: ws.route,
        startTime: ws.startTime,
        clearTime: ws.clearTime,
        swingStart: ws.swingStart ?? null,
        swingEnd: ws.swingEnd ?? null,
        date,
      },
    });
    swapIdx++;
    console.log(`  Work swap: ${ws.route} (${status})`);
  }

  // Days off swaps
  for (const ds of DAYSOFF_SWAPS) {
    const user = allUsers[swapIdx % allUsers.length];
    const status = swapIdx % 4 === 0 ? "pending" : "open";
    await prisma.swap.create({
      data: {
        userId: user.id,
        depotId: user.depot!.id,
        category: "daysoff",
        status,
        posterName: `${user.firstName} ${user.lastName}`,
        details: ds.details,
        fromDay: ds.fromDay,
        toDay: ds.toDay,
        fromDate: new Date(ds.fromDate + "T12:00:00"),
        toDate: new Date(ds.toDate + "T12:00:00"),
        date: new Date(ds.fromDate + "T12:00:00"),
      },
    });
    swapIdx++;
    console.log(`  Days off swap: ${ds.fromDay} → ${ds.toDay} (${status})`);
  }

  // Vacation swaps
  for (const vs of VACATION_SWAPS) {
    const user = allUsers[swapIdx % allUsers.length];
    await prisma.swap.create({
      data: {
        userId: user.id,
        depotId: user.depot!.id,
        category: "vacation",
        status: "open",
        posterName: `${user.firstName} ${user.lastName}`,
        details: vs.details,
        vacationHave: vs.vacationHave,
        vacationWant: vs.vacationWant,
        date: new Date(),
      },
    });
    swapIdx++;
    console.log(`  Vacation swap: ${vs.vacationHave} → ${vs.vacationWant}`);
  }

  console.log("\nDemo seed complete.");
  console.log(`Created ${USERS.length} users and ${WORK_SWAPS.length + DAYSOFF_SWAPS.length + VACATION_SWAPS.length} swaps.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
