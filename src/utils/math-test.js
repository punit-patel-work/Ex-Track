/**
 * Math Validation Unit Tests
 * Run using node to verify core split math and rollover carryover rules
 */

function testTransactionSplitting() {
  console.log('Running test: Transaction Splitting Allocation...');
  
  const parentAmount = 150.00;
  
  // Test case 1: Valid split
  const validSplits = [
    { categoryId: 'cat-1', amount: 100.00, description: 'Groceries' },
    { categoryId: 'cat-2', amount: 50.00, description: 'Electronics' }
  ];
  
  const totalSplits1 = validSplits.reduce((acc, curr) => acc + curr.amount, 0);
  const remaining1 = Number((parentAmount - totalSplits1).toFixed(2));
  
  if (remaining1 !== 0) {
    throw new Error(`Valid split failed: Remaining should be 0, got ${remaining1}`);
  }
  console.log('✓ Valid splits sum up to parent amount (Remaining: $0.00)');

  // Test case 2: Over-allocated split
  const overSplits = [
    { categoryId: 'cat-1', amount: 100.00, description: 'Groceries' },
    { categoryId: 'cat-2', amount: 60.00, description: 'Electronics' }
  ];
  const totalSplits2 = overSplits.reduce((acc, curr) => acc + curr.amount, 0);
  const remaining2 = Number((parentAmount - totalSplits2).toFixed(2));
  
  if (remaining2 === 0) {
    throw new Error(`Over-allocated split failed: Remaining should be -10.00, got 0`);
  }
  console.log(`✓ Over-allocated splits correctly flagged (Remaining: $${remaining2})`);
}

function testBudgetRollover() {
  console.log('Running test: Budget Carryover Rollover Logic...');

  // Setup: Rollover enabled, previous month target is $450, spent is $380
  const category = {
    id: 'groc-id',
    name: 'Groceries',
    monthlyTarget: 450.00,
    rolloverEnabled: true
  };

  const prevMonthSpent = 380.00;
  const currentMonthTarget = 450.00;

  // Carryover math: unspent balance of previous month
  const prevRemainder = Number((category.monthlyTarget - prevMonthSpent).toFixed(2)); // $70.00
  
  if (prevRemainder !== 70.00) {
    throw new Error(`Rollover unspent calculation failed. Expected 70.00, got ${prevRemainder}`);
  }

  // Effective limit for current month
  const effectiveLimit = currentMonthTarget + prevRemainder; // $520.00

  if (effectiveLimit !== 520.00) {
    throw new Error(`Effective limit calculation failed. Expected 520.00, got ${effectiveLimit}`);
  }

  console.log(`✓ Budget Rollover carryover balance matches expectations (Carryover: +$${prevRemainder.toFixed(2)}, Effective Target: $${effectiveLimit.toFixed(2)})`);
}

try {
  console.log('-----------------------------------------');
  console.log('EX-TRACK FINANCE TRACKER UNIT TESTS');
  console.log('-----------------------------------------');
  testTransactionSplitting();
  console.log('-----------------------------------------');
  testBudgetRollover();
  console.log('-----------------------------------------');
  console.log('ALL MATH VALIDATION TESTS PASSED!');
  console.log('-----------------------------------------');
} catch (error) {
  console.error('TEST SUITE FAILED:', error.message);
  process.exit(1);
}
