// Frontend-Backend Integration Test Script
// This script tests the complete integration between frontend forms and backend APIs

class BranchIntegrationTester {
  constructor(baseUrl = 'http://localhost:3000', token = 'mock-jwt-token') {
    this.baseUrl = baseUrl
    this.token = token
    this.testResults = []
  }

  // Helper method to make API requests
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    }
    
    try {
      const response = await fetch(url, { ...defaultOptions, ...options })
      const data = await response.json()
      return { status: response.status, data, success: response.ok }
    } catch (error) {
      return { status: 0, data: { error: error.message }, success: false }
    }
  }

  // Log test results
  logResult(testName, success, details) {
    const result = { testName, success, details, timestamp: new Date().toISOString() }
    this.testResults.push(result)
    console.log(`${success ? '✅' : '❌'} ${testName}:`, details)
  }

  // Test 1: GET Branch by ID - Data Mapping
  async testGetBranchDataMapping() {
    console.log('\n🔍 Testing GET Branch Data Mapping...')
    
    const result = await this.makeRequest('/api/branches/branch-uuid-1')
    
    if (!result.success) {
      this.logResult('GET Branch Data Mapping', false, `API request failed: ${result.data.error}`)
      return false
    }

    // Verify response structure matches frontend FormData interface
    const requiredFields = [
      'branch.name', 'branch.code', 'branch.email', 'branch.phone',
      'branch.address.line1', 'branch.address.city', 'branch.address.state',
      'manager_id', 'operational_details.courses_offered', 'operational_details.timings',
      'assignments.courses', 'assignments.branch_admins', 'bank_details.bank_name'
    ]

    const missingFields = []
    for (const field of requiredFields) {
      const fieldValue = this.getNestedProperty(result.data, field)
      if (fieldValue === undefined || fieldValue === null) {
        missingFields.push(field)
      }
    }

    if (missingFields.length > 0) {
      this.logResult('GET Branch Data Mapping', false, `Missing fields: ${missingFields.join(', ')}`)
      return false
    }

    this.logResult('GET Branch Data Mapping', true, 'All required fields present in API response')
    return true
  }

  // Test 2: PUT Branch - Form Submission
  async testPutBranchFormSubmission() {
    console.log('\n📝 Testing PUT Branch Form Submission...')
    
    const updateData = {
      branch: {
        name: "Updated Test Branch",
        phone: "+1999888777"
      },
      operational_details: {
        holidays: ["2024-12-25", "2024-01-01"]
      }
    }

    const result = await this.makeRequest('/api/branches/branch-uuid-1', {
      method: 'PUT',
      body: JSON.stringify(updateData)
    })

    if (!result.success) {
      this.logResult('PUT Branch Form Submission', false, `Update failed: ${result.data.error}`)
      return false
    }

    // Verify response contains success message
    if (!result.data.message || !result.data.message.includes('successfully')) {
      this.logResult('PUT Branch Form Submission', false, 'No success message in response')
      return false
    }

    this.logResult('PUT Branch Form Submission', true, 'Branch update successful')
    return true
  }

  // Test 3: Error Handling - 401 Unauthorized
  async testErrorHandling401() {
    console.log('\n🚫 Testing 401 Error Handling...')
    
    const result = await this.makeRequest('/api/branches/branch-uuid-1', {
      headers: { 'Authorization': '' } // No token
    })

    if (result.status !== 401) {
      this.logResult('401 Error Handling', false, `Expected 401, got ${result.status}`)
      return false
    }

    if (!result.data.error || !result.data.error.includes('Authorization')) {
      this.logResult('401 Error Handling', false, 'Missing or incorrect error message')
      return false
    }

    this.logResult('401 Error Handling', true, 'Proper 401 error response')
    return true
  }

  // Test 4: Error Handling - 404 Not Found
  async testErrorHandling404() {
    console.log('\n🔍 Testing 404 Error Handling...')
    
    const result = await this.makeRequest('/api/branches/non-existent-id')

    if (result.status !== 404) {
      this.logResult('404 Error Handling', false, `Expected 404, got ${result.status}`)
      return false
    }

    if (!result.data.error || !result.data.error.includes('not found')) {
      this.logResult('404 Error Handling', false, 'Missing or incorrect error message')
      return false
    }

    this.logResult('404 Error Handling', true, 'Proper 404 error response')
    return true
  }

  // Test 5: Error Handling - 400 Bad Request
  async testErrorHandling400() {
    console.log('\n📋 Testing 400 Error Handling...')
    
    const result = await this.makeRequest('/api/branches/branch-uuid-1', {
      method: 'PUT',
      body: 'invalid-json'
    })

    if (result.status !== 400) {
      this.logResult('400 Error Handling', false, `Expected 400, got ${result.status}`)
      return false
    }

    this.logResult('400 Error Handling', true, 'Proper 400 error response')
    return true
  }

  // Test 6: Form Validation Integration
  async testFormValidationIntegration() {
    console.log('\n✅ Testing Form Validation Integration...')
    
    // Test with missing required fields
    const invalidData = {
      branch: {
        name: "", // Empty required field
        code: "",
        email: "invalid-email", // Invalid format
        phone: ""
      }
    }

    const result = await this.makeRequest('/api/branches', {
      method: 'POST',
      body: JSON.stringify(invalidData)
    })

    // Should return 400 for validation errors
    if (result.status !== 400) {
      this.logResult('Form Validation Integration', false, `Expected 400 for validation errors, got ${result.status}`)
      return false
    }

    this.logResult('Form Validation Integration', true, 'Validation errors properly handled')
    return true
  }

  // Test 7: Success Message Display
  async testSuccessMessageDisplay() {
    console.log('\n🎉 Testing Success Message Display...')
    
    const validData = {
      branch: {
        name: "Integration Test Branch",
        code: "ITB01",
        email: "test@integration.com",
        phone: "+1234567890",
        address: {
          line1: "123 Test St",
          area: "Test Area",
          city: "Test City",
          state: "Test State",
          pincode: "12345",
          country: "USA"
        }
      },
      manager_id: "manager-uuid-1",
      operational_details: {
        courses_offered: ["Taekwondo Basics"],
        timings: [{ day: "Monday", open: "09:00", close: "17:00" }],
        holidays: []
      },
      assignments: {
        accessories_available: true,
        courses: ["course-uuid-1"],
        branch_admins: ["coach-uuid-1"]
      },
      bank_details: {
        bank_name: "State Bank of India",
        account_number: "1234567890",
        upi_id: "test@paytm"
      }
    }

    const result = await this.makeRequest('/api/branches', {
      method: 'POST',
      body: JSON.stringify(validData)
    })

    if (!result.success) {
      this.logResult('Success Message Display', false, `Branch creation failed: ${result.data.error}`)
      return false
    }

    // Verify success response structure
    if (!result.data.message || !result.data.branch_id) {
      this.logResult('Success Message Display', false, 'Missing success message or branch ID')
      return false
    }

    this.logResult('Success Message Display', true, 'Success response properly formatted')
    return true
  }

  // Test 8: Data Consistency Check
  async testDataConsistency() {
    console.log('\n🔄 Testing Data Consistency...')
    
    // First, get original data
    const originalResult = await this.makeRequest('/api/branches/branch-uuid-1')
    if (!originalResult.success) {
      this.logResult('Data Consistency', false, 'Failed to get original data')
      return false
    }

    // Update with specific changes
    const updateData = {
      branch: {
        name: "Consistency Test Branch"
      },
      operational_details: {
        holidays: ["2024-12-25", "2024-07-04"]
      }
    }

    const updateResult = await this.makeRequest('/api/branches/branch-uuid-1', {
      method: 'PUT',
      body: JSON.stringify(updateData)
    })

    if (!updateResult.success) {
      this.logResult('Data Consistency', false, 'Update failed')
      return false
    }

    // Get updated data
    const updatedResult = await this.makeRequest('/api/branches/branch-uuid-1')
    if (!updatedResult.success) {
      this.logResult('Data Consistency', false, 'Failed to get updated data')
      return false
    }

    // Verify only specified fields were updated
    const originalData = originalResult.data
    const updatedData = updatedResult.data

    if (updatedData.branch.name !== "Consistency Test Branch") {
      this.logResult('Data Consistency', false, 'Academy name not updated correctly')
      return false
    }

    if (originalData.branch.code !== updatedData.branch.code) {
      this.logResult('Data Consistency', false, 'Unchanged field was modified')
      return false
    }

    this.logResult('Data Consistency', true, 'Data consistency maintained')
    return true
  }

  // Helper method to get nested property
  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj)
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Frontend-Backend Integration Tests...\n')
    
    const tests = [
      this.testGetBranchDataMapping,
      this.testPutBranchFormSubmission,
      this.testErrorHandling401,
      this.testErrorHandling404,
      this.testErrorHandling400,
      this.testFormValidationIntegration,
      this.testSuccessMessageDisplay,
      this.testDataConsistency
    ]

    let passedTests = 0
    const totalTests = tests.length

    for (const test of tests) {
      try {
        const result = await test.call(this)
        if (result) passedTests++
      } catch (error) {
        console.error(`Test failed with error: ${error.message}`)
      }
    }

    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`)
    
    if (passedTests === totalTests) {
      console.log('🎉 All integration tests passed! The system is ready for production.')
    } else {
      console.log('⚠️  Some tests failed. Please review the issues above.')
    }

    return { passedTests, totalTests, results: this.testResults }
  }
}

// Usage instructions
console.log(`
🧪 Branch Management Integration Tester

Usage:
1. Ensure your development server is running (npm run dev)
2. Open browser console on your application
3. Run the following commands:

const tester = new BranchIntegrationTester()
tester.runAllTests()

Or run individual tests:
tester.testGetBranchDataMapping()
tester.testPutBranchFormSubmission()
etc.
`)

// Export for use
if (typeof window !== 'undefined') {
  window.BranchIntegrationTester = BranchIntegrationTester
}
