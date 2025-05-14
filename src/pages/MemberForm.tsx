
// Fix the date input rendering in JSX where toISOString is used:

// For the dob input in editing mode
<Input
  id="dob"
  type="date"
  value={formData.dob ? formData.dob.slice(0, 10) : ''} // Format to YYYY-MM-DD
  onChange={handleDateChange}
  required
  className="border-green-200 focus-visible:ring-green-500"
/>

// For the dob input in creation mode
<Input
  id="dob"
  type="date"
  value={formData.dob ? formData.dob.slice(0, 10) : ''} // Format to YYYY-MM-DD
  onChange={handleDateChange}
  required
  className="border-green-200 focus-visible:ring-green-500"
/>
