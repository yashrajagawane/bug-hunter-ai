import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

const SEED_CASES = [
  // ── JAVASCRIPT ──────────────────────────────────────────
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

const data = [{amount: 10}, {amount: 25}, {amount: 5}];
console.log("Total:", processTransactions(data));`,
    expectedBehavior: "Calculate the exact sum of all transaction amounts. Should print: Total: 40",
    actualBehavior: "Throws TypeError: Cannot read properties of undefined (reading 'amount') on the final iteration due to an off-by-one error.",
    xpReward: 500,
    coinReward: 100,
    timeLimit: 600,
    worldId: "world-1"
  },
  {
    id: "case-003",
    title: "The Phantom Promise",
    story: "An e-commerce checkout service is silently failing. Orders appear placed but inventory is never decremented. The async flow is broken somewhere.",
    difficulty: "Intermediate",
    language: "JavaScript",
    brokenCode: `async function placeOrder(userId, itemId, quantity) {
  const inventory = await getInventory(itemId);
  
  if (inventory < quantity) {
    return { success: false, reason: 'Insufficient stock' };
  }

  // Deduct from inventory and create order concurrently
  updateInventory(itemId, inventory - quantity);
  const order = await createOrder(userId, itemId, quantity);
  
  return { success: true, orderId: order.id };
}

// Stubs for testing
async function getInventory(id) { return 10; }
async function updateInventory(id, qty) { console.log('Inventory updated to:', qty); }
async function createOrder(u, i, q) { return { id: 'ORD-001' }; }

placeOrder('user-1', 'item-1', 3).then(console.log);`,
    expectedBehavior: "Both updateInventory and createOrder should complete before returning. Inventory must always be updated before the order is confirmed.",
    actualBehavior: "updateInventory is called without await, so it runs in the background. The order may be created before inventory is actually updated, causing race conditions and overselling.",
    xpReward: 1000,
    coinReward: 200,
    timeLimit: 900,
    worldId: "world-1"
  },
  {
    id: "case-004",
    title: "The Scope Intruder",
    story: "A banking loop is generating incorrect totals per account. All accounts end up with the last account's balance due to a closure bug.",
    difficulty: "Intermediate",
    language: "JavaScript",
    brokenCode: `const accounts = [
  { id: 'ACC-001', balance: 1500 },
  { id: 'ACC-002', balance: 3200 },
  { id: 'ACC-003', balance: 800 },
];

const reports = [];
for (var i = 0; i < accounts.length; i++) {
  setTimeout(function() {
    reports.push({ account: accounts[i]?.id, balance: accounts[i]?.balance });
    if (reports.length === accounts.length) {
      console.log('Reports:', JSON.stringify(reports));
    }
  }, 10);
}
`,
    expectedBehavior: "Each report should capture the correct account ID and balance: ACC-001/1500, ACC-002/3200, ACC-003/800.",
    actualBehavior: "All reports capture accounts[3] which is undefined, because var is function-scoped and i is already 3 by the time the callbacks run.",
    xpReward: 1200,
    coinReward: 250,
    timeLimit: 900,
    worldId: "world-1"
  },

  // ── PYTHON ──────────────────────────────────────────────
  {
    id: "case-002",
    title: "The Infinite Loop Protocol",
    story: "The drone navigation system is draining batteries instantly. The pathfinding loop never terminates when encountering obstacles.",
    difficulty: "Intermediate",
    language: "Python",
    brokenCode: `def navigate_path(path_steps):
    current_step = 0
    
    while current_step < len(path_steps):
        if path_steps[current_step] == "obstacle":
            print("Avoiding obstacle...")
            continue
            
        print(f"Moving to: {path_steps[current_step]}")
        current_step += 1
        
    return "Destination Reached"

print(navigate_path(["clear", "obstacle", "clear"]))`,
    expectedBehavior: "Should print 'Avoiding obstacle...' once, then continue to remaining steps and return 'Destination Reached'.",
    actualBehavior: "Stuck in an infinite loop when encountering an obstacle because current_step is never incremented inside the obstacle branch.",
    xpReward: 1000,
    coinReward: 250,
    timeLimit: 900,
    worldId: "world-1"
  },
  {
    id: "case-005",
    title: "The Mutable Default",
    story: "A data pipeline is corrupting patient records. Each new patient entry is inheriting the previous one's diagnoses list instead of starting fresh.",
    difficulty: "Intermediate",
    language: "Python",
    brokenCode: `def create_patient_record(name, diagnoses=[]):
    diagnoses.append(f"{name}_initial_check")
    return {"name": name, "diagnoses": diagnoses}

patient_a = create_patient_record("Alice")
patient_b = create_patient_record("Bob")
patient_c = create_patient_record("Charlie")

print(patient_a)
print(patient_b)
print(patient_c)`,
    expectedBehavior: "Each patient should have exactly one diagnosis entry: their own initial check. e.g. Alice: ['Alice_initial_check']",
    actualBehavior: "Python mutable default arguments persist between calls. Bob gets Alice's diagnosis too, Charlie gets both — all records are contaminated.",
    xpReward: 1000,
    coinReward: 200,
    timeLimit: 900,
    worldId: "world-2"
  },
  {
    id: "case-006",
    title: "The Shallow Copy Spy",
    story: "A machine learning pipeline is mysteriously overwriting training data with test data. Mutations in one dataset are bleeding into the other.",
    difficulty: "Advanced",
    language: "Python",
    brokenCode: `import copy

def prepare_datasets(raw_data):
    training = raw_data[:int(len(raw_data) * 0.8)]
    testing = raw_data[int(len(raw_data) * 0.8):]
    
    # Normalize training data
    for record in training:
        record['normalized'] = True
        record['value'] = record['value'] / 100.0
    
    return training, testing

data = [{'id': i, 'value': i * 10} for i in range(10)]
train, test = prepare_datasets(data)
print('Training:', train[:2])
print('Testing:', test[:2])
print('Raw data[8]:', data[8])  # Should be unchanged`,
    expectedBehavior: "Training normalization should only affect the training set. The original raw_data and testing set should remain unchanged with original values.",
    actualBehavior: "List slicing creates shallow copies, so dicts inside are still referenced. Mutating training records also mutates the original data and testing set.",
    xpReward: 1500,
    coinReward: 350,
    timeLimit: 1200,
    worldId: "world-2"
  },

  // ── JAVA ────────────────────────────────────────────────
  {
    id: "case-007",
    title: "The String Identity Crisis",
    story: "An authentication system is randomly denying valid users. The token comparison works 'sometimes' which points to a subtle Java gotcha.",
    difficulty: "Beginner",
    language: "Java",
    brokenCode: `public class AuthService {
    public static boolean validateToken(String userToken, String storedToken) {
        return userToken == storedToken;
    }
    
    public static void main(String[] args) {
        String token1 = new String("Bearer eyJhbGciOiJIUzI1NiJ9");
        String token2 = new String("Bearer eyJhbGciOiJIUzI1NiJ9");
        
        System.out.println("Valid user: " + validateToken(token1, token2));
        System.out.println("Token1 equals Token2: " + token1.equals(token2));
    }
}`,
    expectedBehavior: "validateToken should return true when both tokens contain identical content, regardless of whether they are the same object in memory.",
    actualBehavior: "Using == compares object references, not content. Two different String objects with identical content return false, randomly denying valid sessions.",
    xpReward: 500,
    coinReward: 100,
    timeLimit: 600,
    worldId: "world-1"
  },
  {
    id: "case-008",
    title: "The Integer Overflow Heist",
    story: "A satellite orbital calculation is returning completely wrong values for large distances. The numbers look correct in isolation but the final result is garbage.",
    difficulty: "Advanced",
    language: "Java",
    brokenCode: `public class OrbitalCalculator {
    public static long calculateOrbitalPeriod(int semiMajorAxisKm) {
        // Kepler's third law simplified for LEO estimation
        // T = 2 * PI * sqrt(a^3 / GM)
        // Using simplified integer approximation
        int GM = 398600; // km^3/s^2
        int aCubed = semiMajorAxisKm * semiMajorAxisKm * semiMajorAxisKm;
        return (long) (2 * Math.PI * Math.sqrt((double)aCubed / GM));
    }
    
    public static void main(String[] args) {
        // ISS orbit: ~6771 km semi-major axis
        System.out.println("ISS Period (seconds): " + calculateOrbitalPeriod(6771));
        // Expected: ~5560 seconds (92.7 minutes)
    }
}`,
    expectedBehavior: "Should return approximately 5560 seconds for an ISS-like orbit with semi-major axis of 6771km.",
    actualBehavior: "6771^3 = 310,280,731,011 which overflows int (max ~2.1 billion). The multiplication uses int arithmetic before casting to long, producing a wildly wrong negative number.",
    xpReward: 1500,
    coinReward: 350,
    timeLimit: 1200,
    worldId: "world-2"
  },

  // ── C++ ─────────────────────────────────────────────────
  {
    id: "case-009",
    title: "The Memory Phantom",
    story: "A real-time telemetry system is crashing sporadically in production. Engineers suspect a dangling pointer lurking in the sensor data pipeline.",
    difficulty: "Advanced",
    language: "C++",
    brokenCode: `#include <iostream>
#include <string>
using namespace std;

struct SensorReading {
    double value;
    string unit;
};

SensorReading* getLatestReading() {
    SensorReading reading = {98.6, "Fahrenheit"};
    return &reading; // Return address of local variable
}

int main() {
    SensorReading* data = getLatestReading();
    cout << "Temperature: " << data->value << " " << data->unit << endl;
    return 0;
}`,
    expectedBehavior: "Should reliably print the temperature reading (98.6 Fahrenheit) every time it runs.",
    actualBehavior: "Returns a dangling pointer to a stack-allocated local variable. The variable is destroyed when getLatestReading() returns. Behavior is undefined — sometimes prints garbage values, sometimes crashes.",
    xpReward: 2000,
    coinReward: 500,
    timeLimit: 1500,
    worldId: "world-3"
  },
  {
    id: "case-010",
    title: "The Null Dereference Strike",
    story: "A hospital's patient management system crashes every time it tries to look up a patient who was recently discharged. No null check exists in the critical path.",
    difficulty: "Beginner",
    language: "C++",
    brokenCode: `#include <iostream>
#include <string>
#include <unordered_map>
using namespace std;

struct Patient {
    string name;
    int age;
    string ward;
};

unordered_map<string, Patient*> patientDB;

void admitPatient(string id, string name, int age, string ward) {
    patientDB[id] = new Patient{name, age, ward};
}

void dischargePatient(string id) {
    delete patientDB[id];
    patientDB.erase(id);
}

void printPatientInfo(string id) {
    Patient* p = patientDB.count(id) ? patientDB[id] : nullptr;
    cout << "Name: " << p->name << ", Ward: " << p->ward << endl;
}

int main() {
    admitPatient("P001", "Alice", 34, "ICU");
    dischargePatient("P001");
    printPatientInfo("P001"); // This should handle missing patient gracefully
    return 0;
}`,
    expectedBehavior: "printPatientInfo should check if the patient pointer is null and print a friendly 'Patient not found' message instead of crashing.",
    actualBehavior: "printPatientInfo correctly gets nullptr when patient is discharged but then immediately dereferences it (p->name), causing a null pointer dereference and segfault.",
    xpReward: 500,
    coinReward: 100,
    timeLimit: 600,
    worldId: "world-1"
  },
  {
    id: "case-011",
    title: "The Silent Data Race",
    story: "A fintech trading engine is producing inconsistent portfolio totals under load. The bug only appears with multiple threads — it never shows in single-threaded tests.",
    difficulty: "Expert",
    language: "C++",
    brokenCode: `#include <iostream>
#include <thread>
#include <vector>
using namespace std;

long long portfolioTotal = 0;

void addPositions(vector<long long> positions) {
    for (long long pos : positions) {
        portfolioTotal += pos; // Unsynchronized shared mutation
    }
}

int main() {
    vector<long long> desk1 = {100000, 250000, 75000};
    vector<long long> desk2 = {200000, 150000, 300000};
    vector<long long> desk3 = {50000, 400000, 125000};
    
    thread t1(addPositions, desk1);
    thread t2(addPositions, desk2);
    thread t3(addPositions, desk3);
    
    t1.join();
    t2.join();
    t3.join();
    
    cout << "Portfolio Total: $" << portfolioTotal << endl;
    // Expected: $1,650,000
    return 0;
}`,
    expectedBehavior: "Portfolio total should always be exactly $1,650,000 regardless of thread scheduling.",
    actualBehavior: "portfolioTotal += pos is not atomic. Multiple threads read-modify-write simultaneously, causing lost updates. The total is different on every run and always wrong under load.",
    xpReward: 3000,
    coinReward: 750,
    timeLimit: 1800,
    worldId: "world-3"
  },
  {
    id: "case-012",
    title: "The Recursive Abyss",
    story: "A compiler's symbol resolution module is causing stack overflows on large codebases. The recursive type resolver has no cycle detection and gets trapped in circular type definitions.",
    difficulty: "Expert",
    language: "Python",
    brokenCode: `import sys

# Simulates a type system with circular references
type_registry = {
    'TypeA': 'TypeB',
    'TypeB': 'TypeC',
    'TypeC': 'TypeA',  # Circular!
    'TypeD': 'int',
    'int': None
}

def resolve_type(type_name, depth=0):
    """Recursively resolve a type to its base type."""
    if type_registry.get(type_name) is None:
        return type_name  # Base type reached
    
    base = type_registry[type_name]
    return resolve_type(base, depth + 1)

# This should detect the cycle and raise an informative error
print(resolve_type('TypeD'))  # Should work: returns 'int'
print(resolve_type('TypeA'))  # Should detect cycle and raise error`,
    expectedBehavior: "resolve_type('TypeD') should return 'int'. resolve_type('TypeA') should detect the circular reference and raise a descriptive RecursionError or TypeError instead of crashing with a stack overflow.",
    actualBehavior: "No cycle detection exists. TypeA → TypeB → TypeC → TypeA loops forever until Python's recursion limit is hit and a cryptic RecursionError crashes the entire compiler process.",
    xpReward: 3000,
    coinReward: 750,
    timeLimit: 1800,
    worldId: "world-3"
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
      console.log('Database seeded with ' + SEED_CASES.length + ' cases.');
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
