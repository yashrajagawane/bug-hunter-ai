import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

const SEED_CASES = [
  {
    id: "case-001",
    title: "The Missing Transaction",
    story: "Some customer transactions are disappearing from history during high-load processing. Banking core reports success, but ledger counts are inconsistent.",
    difficulty: "Beginner",
    language: "JavaScript",
    brokenCode: `function processTransactions(transactions) {
  let total = 0;
  for (let i = 0; i <= transactions.length; i++) {
    total += transactions[i].amount;
  }
  return total;
}

// Test Data
const data = [{amount: 10}, {amount: 25}, {amount: 5}];
console.log("Total:", processTransactions(data));`,
    expectedBehavior: "Calculate the exact sum of all transaction amounts in the array.",
    actualBehavior: "Application throws TypeError: Cannot read properties of undefined (reading 'amount') on the final iteration.",
    xpReward: 500,
    coinReward: 100,
    timeLimit: 600,
    worldId: "world-1"
  },
  {
    id: "case-002",
    title: "The Infinite Loop Protocol",
    story: "The drone navigation system is draining batteries instantly. The pathfinding loop seems to never terminate when encountering obstacles.",
    difficulty: "Intermediate",
    language: "Python",
    brokenCode: `def navigate_path(path_steps):
    current_step = 0
    
    while current_step < len(path_steps):
        if path_steps[current_step] == "obstacle":
            print("Avoiding obstacle...")
            # wait, we need to skip the obstacle
            continue
            
        print(f"Moving to: {path_steps[current_step]}")
        current_step += 1
        
    return "Destination Reached"

print(navigate_path(["clear", "obstacle", "clear"]))`,
    expectedBehavior: "The drone should print 'Avoiding obstacle...' and then continue moving to the remaining clear steps, finally returning 'Destination Reached'.",
    actualBehavior: "The drone encounters an obstacle and gets stuck in an infinite loop, constantly avoiding the same obstacle forever.",
    xpReward: 1000,
    coinReward: 250,
    timeLimit: 900,
    worldId: "world-1"
  }
];

export async function seedCasesIfEmpty() {
  try {
    const casesRef = collection(db, "cases");
    const snapshot = await getDocs(casesRef);
    
    if (snapshot.empty) {
      console.log("Seeding database with initial cases...");
      const batch = writeBatch(db);
      
      SEED_CASES.forEach((caseData) => {
        const docRef = doc(db, "cases", caseData.id);
        batch.set(docRef, caseData);
      });
      
      await batch.commit();
      console.log("Database seeded successfully.");
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
