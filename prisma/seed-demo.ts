import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const DEPOT_CODES = ["BP","CS","CA","CH","CP","EN","EC","FR","FB","FP","GA","GH","JG","JA","JF","KB","LG","MV","ME","MQ","MC","QV","SC","TA","UP","WF","YK","YU"];

const FIRST_NAMES = [
  "Marcus","Diana","Kevin","Patricia","Darnell","Shanice","Robert","Latoya","James","Michelle",
  "Anthony","Brenda","Tyrone","Keisha","Raymond","Veronica","Curtis","Denise","Jerome","Tanya",
  "Andre","Monique","Clarence","Yolanda","Reginald","Tamika","Leon","Felicia","Calvin","Renee",
  "Earl","Cheryl","Floyd","Bernadette","Roosevelt","Gwendolyn","Wendell","Rochelle","Alton","Lorraine",
  "Derek","Charlene","Marvin","Adrienne","Glenn","Jacqueline","Rodney","Valerie","Nathaniel","Crystal",
  "Harold","Sylvia","Bernard","Carolyn","Ernest","Theresa","Herman","Vanessa","Clifford","Barbara",
  "Leroy","Dorothy","Willie","Gloria","Walter","Ruth","Arthur","Evelyn","Howard","Frances",
  "Frank","Alice","George","Helen","Thomas","Virginia","Charles","Martha","Edward","Elizabeth",
  "Henry","Sandra","William","Lisa","Richard","Karen","Michael","Nancy","David","Betty",
  "Daniel","Margaret","Joseph","Jennifer","Paul","Susan","Mark","Angela","Donald","Sarah",
  "Steven","Dorothy","Kenneth","Jessica","Brian","Amanda","Gary","Melissa","Timothy","Deborah",
  "Jose","Maria","Carlos","Ana","Miguel","Rosa","Juan","Carmen","Luis","Gloria",
  "Roberto","Elena","Manuel","Isabel","Pedro","Lucia","Francisco","Teresa","Antonio","Marta",
  "Kwame","Amara","Kofi","Abena","Kwabena","Akua","Yaw","Adwoa","Kojo","Ama",
  "Jamal","Aaliyah","DeShawn","Destiny","Malik","Imani","Rasheed","Jasmine","Terrell","Brianna",
  "Xavier","Camille","Dominique","Serena","Damien","Simone","Laurent","Chanel","Remy","Celeste",
  "Hector","Rosa","Rafael","Marisol","Ernesto","Xiomara","Alejandro","Yessenia","Felix","Luz",
  "Jin","Mei","Wei","Ling","Tao","Hui","Bao","Fang","Zhen","Yan",
  "Aisha","Fatima","Hassan","Zara","Omar","Layla","Kareem","Nadia","Tariq","Amira",
  "Patrick","Colleen","Sean","Maureen","Brendan","Siobhan","Declan","Aoife","Conor","Niamh",
];

const LAST_NAMES = [
  "Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Wilson","Anderson","Taylor",
  "Thomas","Jackson","White","Harris","Martin","Thompson","Robinson","Clark","Rodriguez","Lewis",
  "Lee","Walker","Hall","Allen","Young","Hernandez","King","Wright","Lopez","Hill",
  "Scott","Green","Adams","Baker","Nelson","Carter","Mitchell","Perez","Roberts","Turner",
  "Phillips","Campbell","Parker","Evans","Edwards","Collins","Stewart","Sanchez","Morris","Rogers",
  "Reed","Cook","Morgan","Bell","Murphy","Bailey","Rivera","Cooper","Richardson","Cox",
  "Howard","Ward","Torres","Peterson","Gray","Ramirez","James","Watson","Brooks","Kelly",
  "Sanders","Price","Bennett","Wood","Barnes","Ross","Henderson","Coleman","Jenkins","Perry",
  "Powell","Long","Patterson","Hughes","Flores","Washington","Butler","Simmons","Foster","Gonzales",
  "Bryant","Alexander","Russell","Griffin","Diaz","Hayes","Myers","Ford","Hamilton","Graham",
  "Sullivan","Wallace","Woods","Cole","West","Jordan","Owens","Reynolds","Fisher","Ellis",
  "Harrison","Gibson","Mcdonald","Cruz","Marshall","Ortiz","Gomez","Murray","Freeman","Wells",
  "Webb","Simpson","Stevens","Tucker","Porter","Hunter","Hicks","Crawford","Henry","Boyd",
  "Mason","Morales","Kennedy","Warren","Dixon","Ramos","Reyes","Burns","Gordon","Shaw",
  "Holmes","Rice","Robertson","Henderson","Patterson","Alvarez","Castillo","Gutierrez","Chavez","Romero",
  "Okafor","Mensah","Asante","Boateng","Owusu","Amponsah","Darko","Appiah","Acheampong","Amoah",
  "Baptiste","Leblanc","Delacroix","Dupont","Fontaine","Beaumont","Girard","Leclerc","Mercier","Renard",
  "Yamamoto","Tanaka","Watanabe","Suzuki","Sato","Ito","Nakamura","Kobayashi","Kato","Yoshida",
  "Okonkwo","Adeyemi","Afolabi","Nwosu","Eze","Chukwu","Nwachukwu","Obiora","Obi","Nkem",
  "OBrien","McCarthy","Fitzpatrick","Gallagher","Brennan","Doyle","Burke","Nolan","Ryan","Quinn",
];

const ROUTES = [
  "B1","B2","B3","B4","B6","B7","B8","B9","B11","B12","B13","B14","B15","B16","B17","B20","B25","B26","B31","B32","B35","B36","B37","B38","B39","B41","B42","B43","B44","B44-SBS","B45","B46","B46-SBS","B47","B48","B49","B52","B54","B57","B60","B61","B62","B63","B65","B67","B68","B69","B70","B74","B82","B82-SBS","B83","B84","B103",
  "Bx1","Bx2","Bx3","Bx4","Bx4A","Bx5","Bx6","Bx7","Bx8","Bx9","Bx10","Bx11","Bx12","Bx12-SBS","Bx13","Bx15","Bx16","Bx17","Bx18","Bx19","Bx20","Bx21","Bx22","Bx23","Bx24","Bx25","Bx26","Bx27","Bx28","Bx29","Bx30","Bx31","Bx32","Bx33","Bx34","Bx35","Bx36","Bx38","Bx39","Bx40","Bx41","Bx42",
  "M1","M2","M3","M4","M5","M7","M8","M9","M10","M11","M14A","M14D","M15","M15-SBS","M20","M21","M22","M23-SBS","M31","M34","M34A-SBS","M35","M42","M50","M55","M57","M60-SBS","M66","M72","M79-SBS","M86-SBS","M96","M98","M100","M101","M102","M103","M104","M106","M116",
  "Q1","Q2","Q3","Q4","Q5","Q6","Q7","Q8","Q9","Q10","Q11","Q12","Q13","Q15","Q15A","Q16","Q17","Q18","Q19","Q20A","Q20B","Q21","Q22","Q23","Q24","Q25","Q26","Q27","Q28","Q29","Q30","Q31","Q32","Q33","Q34","Q35","Q36","Q37","Q38","Q39","Q40","Q41","Q42","Q43","Q44","Q44-SBS","Q46","Q47","Q48","Q49","Q52-SBS","Q53-SBS","Q54","Q55","Q56","Q58","Q59","Q60","Q64","Q65","Q66","Q67","Q69","Q70-SBS","Q72","Q76","Q77","Q83","Q84","Q85","Q88","Q100","Q101","Q102","Q103","Q104","Q110","Q111","Q112","Q113",
  "S40","S42","S44","S46","S48","S51","S52","S53","S54","S55","S56","S57","S59","S61","S62","S66","S74","S76","S78","S79-SBS","S81","S84","S86","S87","S88","S89","S90","S91","S92","S93","S94","S96","S98",
  "BM1","BM2","BM3","BM4","BM5","QM1","QM2","QM3","QM4","QM5","QM6","QM7","QM8","QM10","QM11","QM12","QM15","QM16","QM17","QM18","QM20","QM21","QM24","QM25","QM31","QM32","QM34","QM35","QM36","QM40","QM42","QM44",
];

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const WORK_DETAILS = [
  "Looking to swap this piece. Open to any comparable run at my depot.",
  "Need to switch this shift for a personal appointment. Great run, easy route.",
  "Trading this piece — looking for something later in the day.",
  "Early AM run available. Would prefer a mid-day or PM piece.",
  "Night piece available, looking for a day shift. Contact me ASAP.",
  "Reliable route, always on time. Need a day off this week, open to any trade.",
  "SBS piece available. Clean bus, easy terminals. Looking for straight run.",
  "Need to swap for a family obligation. Flexible on what I pick up.",
  "This is a solid piece with minimal traffic. Looking for any weekday swap.",
  "Midday run, great layovers. Willing to work with your schedule.",
  "Express run available — easy highway piece. Looking for local run.",
  "Good piece, looking to swap just for next week. Flexible on route.",
  "Available to swap ASAP. Reliable operator with strong rep.",
  "Run ends at a convenient terminal. Looking for similar or earlier clear.",
  "Weekend piece available. Looking for a weekday in exchange.",
  "Short piece with great recovery time. Open to comparable swaps.",
  "Swing piece available — split shift. Looking for straight piece.",
  "Overnight piece — looking for any AM or PM straight run.",
  "Early bird piece, great for someone who lives nearby. Looking for PM.",
  "Dependable route, no issues. Need this day off for court appearance.",
];
const DAYSOFF_DETAILS = [
  "Need this day off for a doctor's appointment. Will take your day no questions asked.",
  "Family event coming up. Flexible on what day I pick up in exchange.",
  "Trading my day off for any weekday. Easy swap.",
  "Have a long weekend coming up and need to shift my RDO.",
  "School event for my kids. Need to be there. Trading my day off.",
  "Court date. Need this specific day off. Will work any of your days.",
  "Moving apartments. Just need the one day. Flexible on trade.",
  "Medical procedure scheduled. Need this day guaranteed.",
  "Union meeting I can't miss. Looking to swap just this one day.",
  "Anniversary trip — need specific date off. Will trade any comparable day.",
  "Graduation ceremony. Non-negotiable date. Happy to pick up a holiday.",
  "Car repair appointment that was hard to schedule. Need the day.",
  "Immigration appointment. Need this day, can't reschedule.",
  "Kid's recital. Been planning for months. Any day in trade.",
  "Just need a long weekend this one time. Trading my Friday for your Monday.",
];
const VACATION_DETAILS = [
  "Booked a trip and need to move my vacation week. Flexible on which week I take.",
  "Family reunion is that specific week. Need to swap vacation ASAP.",
  "Got a cruise deal that week. Trading my vacation week — open to offers.",
  "Kid starts school that week, need to be available. Trading my vacation.",
  "Religious observance. Need that specific week off.",
  "Surgery scheduled. Need the week I have to recover. Will swap.",
  "Visiting family out of country. Need flexibility on vacation week.",
  "Concert tickets, hotel booked. Need this week. Willing to trade.",
  "My spouse has that week off and we want to travel together. Will trade.",
  "Just need a summer week instead of the one I got. Open to any swap.",
];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "WMNY-";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
function padTime(h: number, m: number): string { return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`; }
function randTime(): string { return padTime(randInt(4,22), [0,15,30,45][randInt(0,3)]); }
function futureDate(daysAhead: number): Date { const d = new Date(); d.setDate(d.getDate() + daysAhead); return d; }

async function main() {
  console.log("Fetching depots...");
  const depots = await prisma.depot.findMany();
  const depotMap: Record<string, string> = {};
  for (const d of depots) depotMap[d.code] = d.id;

  // Check existing demo user count
  const existingCount = await prisma.user.count({ where: { email: { endsWith: "@mta.com" } } });
  console.log(`Existing demo users: ${existingCount}`);

  const pwHash = await bcrypt.hash("password123", 10);
  const usedNames = new Set<string>();
  const createdUsers: { id: string; depotId: string; name: string }[] = [];

  // Load already-created demo users
  const existingUsers = await prisma.user.findMany({
    where: { email: { endsWith: "@mta.com" }, NOT: { email: "system@wemoveny.internal" } },
    select: { id: true, depotId: true, firstName: true, lastName: true },
  });
  for (const u of existingUsers) {
    usedNames.add(`${u.firstName} ${u.lastName}`);
    if (u.depotId) createdUsers.push({ id: u.id, depotId: u.depotId, name: `${u.firstName} ${u.lastName}` });
  }

  const target = 200;
  const toCreate = target - existingUsers.length;
  console.log(`Creating ${toCreate} new operators...`);

  let created = 0;
  let attempts = 0;
  const depotIdx = { current: 0 };

  while (created < toCreate && attempts < toCreate * 10) {
    attempts++;
    const firstName = rand(FIRST_NAMES);
    const lastName = rand(LAST_NAMES);
    const fullName = `${firstName} ${lastName}`;
    if (usedNames.has(fullName)) continue;
    usedNames.add(fullName);

    const depotCode = DEPOT_CODES[depotIdx.current % DEPOT_CODES.length];
    depotIdx.current++;
    const depotId = depotMap[depotCode];
    if (!depotId) continue;

    const emailSlug = `${firstName.toLowerCase().replace(/[^a-z]/g,"")}.${lastName.toLowerCase().replace(/[^a-z]/g,"")}.${crypto.randomBytes(2).toString("hex")}`;
    const completed = randInt(0, 35);
    const cancelled = randInt(0, Math.max(0, Math.floor(completed * 0.15)));
    const noShow = Math.random() < 0.05 ? 1 : 0;

    try {
      const user = await prisma.user.create({
        data: {
          email: `${emailSlug}@mta.com`,
          passwordHash: pwHash,
          firstName,
          lastName,
          depotId,
          verified: true,
        },
      });

      await prisma.reputation.create({
        data: { userId: user.id, completed, cancelled, noShow },
      });

      if (completed > 0) {
        const fakeSwap = await prisma.swap.create({
          data: {
            userId: user.id, depotId, category: "work", status: "filled",
            details: "Historical", posterName: fullName, date: new Date("2025-06-01"),
          },
        });
        const reviewCount = Math.min(completed, randInt(2, 8));
        const baseRating = randInt(3, 5);
        for (let i = 0; i < reviewCount; i++) {
          const r = Math.max(3, baseRating + (Math.random() < 0.2 ? -1 : 0));
          await prisma.review.create({
            data: { swapId: fakeSwap.id, reviewerId: user.id, reviewedId: user.id, rating: r },
          });
        }
      }

      // Invite codes
      for (let i = 0; i < 3; i++) {
        await prisma.inviteCode.create({ data: { code: genCode(), createdBy: user.id } });
      }

      createdUsers.push({ id: user.id, depotId, name: fullName });
      created++;
      if (created % 20 === 0) console.log(`  ${created}/${toCreate} users created...`);
    } catch { /* skip duplicates */ }
  }

  console.log(`\nCreated ${created} new users. Total: ${createdUsers.length}`);

  // Count existing live swaps
  const existingSwaps = await prisma.swap.count({ where: { status: { in: ["open","pending"] }, details: { not: "Historical" } } });
  console.log(`Existing active swaps: ${existingSwaps}`);

  const swapTarget = 150;
  const swapsToCreate = Math.max(0, swapTarget - existingSwaps);
  console.log(`Creating ${swapsToCreate} new swaps...`);

  const liveUsers = createdUsers.filter(u => u.depotId);
  let swapCreated = 0;

  for (let i = 0; i < swapsToCreate; i++) {
    const u = rand(liveUsers);
    const roll = Math.random();
    const status = roll < 0.65 ? "open" : roll < 0.85 ? "pending" : "filled";

    if (Math.random() < 0.45) {
      // Work swap
      const route = rand(ROUTES);
      const runNum = `R${randInt(1,999).toString().padStart(3,"0")}`;
      const startH = randInt(4, 20);
      const clearH = startH + randInt(7, 9);
      const hasSwing = Math.random() < 0.3;
      const swingStartH = startH + randInt(2, 3);

      await prisma.swap.create({
        data: {
          userId: u.id, depotId: u.depotId, category: "work", status,
          posterName: u.name, details: rand(WORK_DETAILS),
          run: runNum, route,
          startTime: padTime(startH, [0,15,30,45][randInt(0,3)]),
          clearTime: padTime(clearH % 24, [0,15,30,45][randInt(0,3)]),
          swingStart: hasSwing ? padTime(swingStartH, 0) : null,
          swingEnd: hasSwing ? padTime(swingStartH + 1, 30) : null,
          contact: Math.random() < 0.6 ? `${rand(["718","347","929","646","212"])}-555-${randInt(1000,9999)}` : null,
          date: futureDate(randInt(1, 30)),
        },
      });
      swapCreated++;
    } else if (Math.random() < 0.55) {
      // Days off swap
      const fromIdx = randInt(0, 6);
      let toIdx = randInt(0, 6);
      while (toIdx === fromIdx) toIdx = randInt(0, 6);
      const fromDate = futureDate(randInt(2, 21));
      const toDate = futureDate(randInt(2, 21));

      await prisma.swap.create({
        data: {
          userId: u.id, depotId: u.depotId, category: "daysoff", status,
          posterName: u.name, details: rand(DAYSOFF_DETAILS),
          fromDay: DAYS[fromIdx], toDay: DAYS[toIdx],
          fromDate, toDate, date: fromDate,
        },
      });
      swapCreated++;
    } else {
      // Vacation swap
      const haveWeek = randInt(1, 52);
      let wantWeek = randInt(1, 52);
      while (wantWeek === haveWeek) wantWeek = randInt(1, 52);

      await prisma.swap.create({
        data: {
          userId: u.id, depotId: u.depotId, category: "vacation", status: "open",
          posterName: u.name, details: rand(VACATION_DETAILS),
          vacationHave: `Week ${haveWeek}`, vacationWant: `Week ${wantWeek}`,
          date: new Date(),
        },
      });
      swapCreated++;
    }
  }

  console.log(`\nCreated ${swapCreated} new swaps.`);
  console.log("Demo seed complete.");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
