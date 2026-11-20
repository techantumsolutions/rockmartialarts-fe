/**
 * Test script to verify dynamic course filtering functionality
 * Run this in the browser console on the student reports page
 */

console.log('🧪 Testing Dynamic Course Filtering');

// Test 1: Check if branches with courses data is loaded
function testBranchesWithCoursesData() {
  console.log('\n📋 Test 1: Checking branches with courses data...');
  
  // Check if the data is available in the component state
  // This would need to be accessed through React DevTools or component inspection
  console.log('✅ This test requires manual verification in React DevTools');
  console.log('   Look for: branchesWithCourses, allCourses, filteredCourses state');
}

// Test 2: Test API endpoint directly
async function testAPIEndpoint() {
  console.log('\n🌐 Test 2: Testing API endpoint directly...');
  
  try {
    // Get token from localStorage (assuming it's stored there)
    const token = localStorage.getItem('token') || 'test-token';
    
    const response = await fetch('/api/backend/branches-with-courses', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response received:', data);
      
      if (data.branches && data.branches.length > 0) {
        console.log(`✅ Found ${data.branches.length} branches`);
        
        data.branches.forEach((branch, index) => {
          console.log(`   Branch ${index + 1}: ${branch.branch?.name} (${branch.branch?.code})`);
          console.log(`   Courses: ${branch.courses?.length || 0}`);
          
          if (branch.courses && branch.courses.length > 0) {
            branch.courses.forEach((course, courseIndex) => {
              console.log(`     Course ${courseIndex + 1}: ${course.title || course.name} (${course.code})`);
            });
          }
        });
        
        return data;
      } else {
        console.log('⚠️  No academies found in response');
        return null;
      }
    } else {
      console.log('❌ API request failed:', response.status, response.statusText);
      return null;
    }
  } catch (error) {
    console.log('❌ API request error:', error);
    return null;
  }
}

// Test 3: Test dropdown interaction simulation
function testDropdownInteraction() {
  console.log('\n🎯 Test 3: Testing dropdown interaction...');
  
  // Find branch dropdown
  const branchDropdown = document.querySelector('[data-testid="branch-dropdown"]') || 
                        document.querySelector('select[name="branch_id"]') ||
                        document.querySelector('[role="combobox"]');
  
  if (branchDropdown) {
    console.log('✅ Branch dropdown found');
    
    // Find course dropdown
    const courseDropdown = document.querySelector('[data-testid="course-dropdown"]') || 
                          document.querySelector('select[name="course_id"]');
    
    if (courseDropdown) {
      console.log('✅ Course dropdown found');
      console.log('✅ Manual test: Select an academy and verify courses update');
    } else {
      console.log('⚠️  Course dropdown not found');
    }
  } else {
    console.log('⚠️  Branch dropdown not found');
  }
}

// Test 4: Check for console errors
function checkConsoleErrors() {
  console.log('\n🔍 Test 4: Checking for console errors...');
  console.log('✅ Check the console for any red error messages');
  console.log('✅ Look for network errors in the Network tab');
}

// Test 5: Verify expected behavior
function verifyExpectedBehavior() {
  console.log('\n✅ Test 5: Expected Behavior Verification');
  console.log('Expected behavior:');
  console.log('1. Page loads with branch dropdown populated');
  console.log('2. Course dropdown shows "All Courses" initially');
  console.log('3. When selecting "testtt (test)" branch:');
  console.log('   - Course dropdown should show "sunil (test)" option');
  console.log('   - Previous course selection should be cleared if not available');
  console.log('4. When selecting "All Academies":');
  console.log('   - Course dropdown should show all available courses');
  console.log('5. Loading states should be shown during API calls');
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Dynamic Course Filtering Tests');
  console.log('==========================================');
  
  testBranchesWithCoursesData();
  await testAPIEndpoint();
  testDropdownInteraction();
  checkConsoleErrors();
  verifyExpectedBehavior();
  
  console.log('\n🎉 Tests completed! Check the results above.');
  console.log('📝 Manual verification required for UI interactions.');
}

// Auto-run tests
runAllTests();

// Export functions for manual testing
window.testDynamicCourseFiltering = {
  testBranchesWithCoursesData,
  testAPIEndpoint,
  testDropdownInteraction,
  checkConsoleErrors,
  verifyExpectedBehavior,
  runAllTests
};

console.log('\n💡 Available test functions:');
console.log('- testDynamicCourseFiltering.testAPIEndpoint()');
console.log('- testDynamicCourseFiltering.runAllTests()');
