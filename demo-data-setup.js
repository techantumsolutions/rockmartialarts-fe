// Demo Data Setup Script for Branch Management Testing
// Run this script to populate the application with test data

const demoData = {
  branches: [
    {
      id: "branch-uuid-1",
      branch: {
        name: "Downtown Martial Arts Academy",
        code: "DMA01",
        email: "downtown@martialarts.com",
        phone: "+1234567890",
        address: {
          line1: "123 Main Street",
          area: "Downtown District",
          city: "New York",
          state: "New York",
          pincode: "10001",
          country: "USA"
        }
      },
      manager_id: "manager-uuid-1",
      operational_details: {
        courses_offered: ["Taekwondo Basics", "Advanced Karate", "Kids Martial Arts"],
        timings: [
          { day: "Monday", open: "09:00", close: "18:00" },
          { day: "Tuesday", open: "09:00", close: "18:00" },
          { day: "Wednesday", open: "09:00", close: "18:00" },
          { day: "Thursday", open: "09:00", close: "18:00" },
          { day: "Friday", open: "09:00", close: "18:00" },
          { day: "Saturday", open: "10:00", close: "16:00" }
        ],
        holidays: ["2024-12-25", "2024-01-01", "2024-07-04", "2024-11-28"]
      },
      assignments: {
        accessories_available: true,
        courses: ["course-uuid-1", "course-uuid-2", "course-uuid-6"],
        branch_admins: ["coach-uuid-1", "coach-uuid-2"]
      },
      bank_details: {
        bank_name: "State Bank of India",
        account_number: "1234567890123456",
        upi_id: "downtown@paytm"
      },
      is_active: true,
      created_at: "2024-01-20T10:30:00Z",
      updated_at: "2024-01-20T10:30:00Z"
    },
    {
      id: "branch-uuid-2",
      branch: {
        name: "Uptown Elite Dojo",
        code: "UED01",
        email: "uptown@elitedojo.com",
        phone: "+1987654321",
        address: {
          line1: "456 Oak Avenue",
          area: "Uptown Heights",
          city: "Los Angeles",
          state: "California",
          pincode: "90210",
          country: "USA"
        }
      },
      manager_id: "manager-uuid-2",
      operational_details: {
        courses_offered: ["Kung Fu Fundamentals", "Mixed Martial Arts", "Self Defense for Women"],
        timings: [
          { day: "Monday", open: "08:00", close: "20:00" },
          { day: "Wednesday", open: "08:00", close: "20:00" },
          { day: "Friday", open: "08:00", close: "20:00" },
          { day: "Saturday", open: "09:00", close: "17:00" },
          { day: "Sunday", open: "10:00", close: "15:00" }
        ],
        holidays: ["2024-07-04", "2024-11-28", "2024-12-31"]
      },
      assignments: {
        accessories_available: false,
        courses: ["course-uuid-3", "course-uuid-4", "course-uuid-5"],
        branch_admins: ["coach-uuid-3", "coach-uuid-4"]
      },
      bank_details: {
        bank_name: "HDFC Bank",
        account_number: "9876543210987654",
        upi_id: "uptown@ybl"
      },
      is_active: true,
      created_at: "2024-02-15T14:20:00Z",
      updated_at: "2024-02-15T14:20:00Z"
    },
    {
      id: "branch-uuid-3",
      branch: {
        name: "Suburban Training Center",
        code: "STC01",
        email: "suburban@trainingcenter.com",
        phone: "+1555123456",
        address: {
          line1: "789 Pine Road",
          area: "Suburban Valley",
          city: "Chicago",
          state: "Illinois",
          pincode: "60601",
          country: "USA"
        }
      },
      manager_id: "manager-uuid-3",
      operational_details: {
        courses_offered: ["Advanced Karate", "Taekwondo Basics", "Mixed Martial Arts"],
        timings: [
          { day: "Tuesday", open: "07:00", close: "19:00" },
          { day: "Thursday", open: "07:00", close: "19:00" },
          { day: "Saturday", open: "08:00", close: "18:00" },
          { day: "Sunday", open: "09:00", close: "16:00" }
        ],
        holidays: ["2024-05-27", "2024-09-02", "2024-10-14"]
      },
      assignments: {
        accessories_available: true,
        courses: ["course-uuid-2", "course-uuid-1", "course-uuid-5"],
        branch_admins: ["coach-uuid-1", "coach-uuid-3"]
      },
      bank_details: {
        bank_name: "Axis Bank",
        account_number: "5555666677778888",
        upi_id: "suburban@axisbank"
      },
      is_active: true,
      created_at: "2024-03-10T09:15:00Z",
      updated_at: "2024-03-10T09:15:00Z"
    }
  ],
  
  managers: [
    { id: "manager-uuid-1", name: "Ravi Kumar", email: "ravi@martialarts.com" },
    { id: "manager-uuid-2", name: "Priya Sharma", email: "priya@martialarts.com" },
    { id: "manager-uuid-3", name: "Amit Singh", email: "amit@martialarts.com" },
    { id: "manager-uuid-4", name: "Sunita Patel", email: "sunita@martialarts.com" }
  ],
  
  courses: [
    { id: "course-uuid-1", name: "Taekwondo Basics", description: "Introduction to Taekwondo fundamentals" },
    { id: "course-uuid-2", name: "Advanced Karate", description: "Advanced Karate techniques and forms" },
    { id: "course-uuid-3", name: "Kung Fu Fundamentals", description: "Traditional Kung Fu training" },
    { id: "course-uuid-4", name: "Self Defense for Women", description: "Practical self-defense techniques" },
    { id: "course-uuid-5", name: "Mixed Martial Arts", description: "Comprehensive MMA training" },
    { id: "course-uuid-6", name: "Kids Martial Arts", description: "Martial arts program for children" }
  ],
  
  coaches: [
    { id: "coach-uuid-1", name: "Coach John Lee", specialization: "Taekwondo" },
    { id: "coach-uuid-2", name: "Coach Sarah Kim", specialization: "Karate" },
    { id: "coach-uuid-3", name: "Sensei David Wong", specialization: "Kung Fu" },
    { id: "coach-uuid-4", name: "Coach Maria Garcia", specialization: "Self Defense" }
  ]
}

// Test scenarios for comprehensive testing
const testScenarios = {
  createBranch: {
    validData: {
      branch: {
        name: "Test Branch Academy",
        code: "TBA01",
        email: "test@academy.com",
        phone: "+1111222333",
        address: {
          line1: "999 Test Street",
          area: "Test District",
          city: "Test City",
          state: "Test State",
          pincode: "12345",
          country: "USA"
        }
      },
      manager_id: "manager-uuid-1",
      operational_details: {
        courses_offered: ["Taekwondo Basics", "Advanced Karate"],
        timings: [
          { day: "Monday", open: "09:00", close: "17:00" },
          { day: "Wednesday", open: "09:00", close: "17:00" }
        ],
        holidays: ["2024-12-25"]
      },
      assignments: {
        accessories_available: true,
        courses: ["course-uuid-1", "course-uuid-2"],
        branch_admins: ["coach-uuid-1"]
      },
      bank_details: {
        bank_name: "State Bank of India",
        account_number: "1111222233334444",
        upi_id: "test@paytm"
      }
    },
    invalidData: {
      // Missing required fields for validation testing
      branch: {
        name: "",
        code: "",
        email: "invalid-email",
        phone: "",
        address: {
          line1: "",
          area: "",
          city: "",
          state: "",
          pincode: "",
          country: "USA"
        }
      }
    }
  },
  
  updateBranch: {
    partialUpdate: {
      branch: {
        name: "Updated Academy Name",
        phone: "+1999888777"
      },
      operational_details: {
        holidays: ["2024-12-25", "2024-01-01", "2024-07-04"]
      }
    }
  }
}

// API testing functions
const apiTests = {
  async testGetBranch(branchId, token) {
    try {
      const response = await fetch(`/api/branches/${branchId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      return await response.json()
    } catch (error) {
      console.error('Error testing GET branch:', error)
      return null
    }
  },
  
  async testUpdateBranch(branchId, updateData, token) {
    try {
      const response = await fetch(`/api/branches/${branchId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })
      return await response.json()
    } catch (error) {
      console.error('Error testing PUT branch:', error)
      return null
    }
  },
  
  async testCreateBranch(branchData, token) {
    try {
      const response = await fetch('/api/branches', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(branchData)
      })
      return await response.json()
    } catch (error) {
      console.error('Error testing POST branch:', error)
      return null
    }
  }
}

// Export for use in testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { demoData, testScenarios, apiTests }
}

// Browser console usage
if (typeof window !== 'undefined') {
  window.demoData = demoData
  window.testScenarios = testScenarios
  window.apiTests = apiTests
  console.log('Demo data loaded! Access via window.demoData, window.testScenarios, window.apiTests')
}
