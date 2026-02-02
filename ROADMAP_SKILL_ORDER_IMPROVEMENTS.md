# Roadmap and Skill Order Improvements

## ✅ Completed Features

### 1. Year-wise Filtering in Skill Proficiency
- **Location**: Admin Dashboard → Group Insights → Skill Proficiency
- **Status**: ✅ IMPLEMENTED
- **Details**: 
  - Added year filter dropdown (All Years, I, II, III, IV)
  - Filter applied to both SuperAdmin and Faculty views
  - Works with all status filters (Cleared, Not Cleared, Ongoing, Not Attempted)
  - Pagination updates correctly with year filter

---

## 🔄 Pending Features

### 2. Year-wise Filtering in Task & Assignments
- **Location**: Task & Assignments pages (SuperAdmin & Faculty)
- **Required Changes**:
  1. Add year filter dropdown in UI
  2. Apply filter to task list
  3. Update pagination when year filter changes
  
**Files to modify**:
- `Frontend/src/pages/SuperAdmin/Task&Assignments/Task&assignments.jsx`
- `Frontend/src/pages/Faculty/Task&Assignments/Task&assignments.jsx`

---

### 3. Roadmap - Venue-Specific Publishing
**Current Behavior**: Roadmap is created for ALL venues globally
**New Behavior**: Select specific venues to publish roadmap

**Required Changes**:

#### Backend Updates:
**File**: `server/controllers/roadmap.controller.js`

1. **Add `venue_id` column to roadmaps table** (if not exists):
```sql
ALTER TABLE roadmaps 
ADD COLUMN venue_id INT NULL,
ADD FOREIGN KEY (venue_id) REFERENCES venue(venue_id);
```

2. **Modify `createRoadmap` function**:
   - Accept `venue_ids` array in request body
   - Create separate roadmap entry for each selected venue
   - Or create junction table `roadmap_venues` for many-to-many relationship

3. **Modify `getRoadmaps` function**:
   - Filter by venue_id when fetching
   - Show which venues each roadmap is published to

4. **Add `updateRoadmapVenues` function**:
   - Allow adding/removing venues from existing roadmap
   - Update roadmap_venues junction table

#### Frontend Updates:
**File**: `Frontend/src/pages/SuperAdmin/RoadMap&Material/RoadMap&Material.jsx`

1. **Add Venue Selection in Create Roadmap Dialog**:
   - Multi-select dropdown for venues
   - "Select All Venues" checkbox option
   - Show selected venue count

2. **Add Venue Management to Existing Roadmaps**:
   - Show which venues roadmap is published to
   - Button to "Manage Venues" for each roadmap
   - Modal to add/remove venues

3. **Venue Selection Component**:
```jsx
const [selectedVenues, setSelectedVenues] = useState([]);
const [selectAllVenues, setSelectAllVenues] = useState(false);

// Multi-select venue dropdown
<div>
  <label>Publish to Venues</label>
  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
    <input 
      type="checkbox" 
      checked={selectAllVenues}
      onChange={(e) => {
        setSelectAllVenues(e.target.checked);
        if (e.target.checked) {
          setSelectedVenues(venues.map(v => v.venue_id));
        } else {
          setSelectedVenues([]);
        }
      }}
    />
    <label>Select All Venues</label>
  </div>
  
  <select 
    multiple 
    value={selectedVenues}
    onChange={(e) => {
      const values = Array.from(e.target.selectedOptions, option => option.value);
      setSelectedVenues(values);
      setSelectAllVenues(values.length === venues.length);
    }}
    style={{ minHeight: '150px', width: '100%' }}
  >
    {venues.map(venue => (
      <option key={venue.venue_id} value={venue.venue_id}>
        {venue.venue_name}
      </option>
    ))}
  </select>
  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
    {selectedVenues.length} venue(s) selected
  </div>
</div>
```

---

### 4. Skill Order - Venue and Year Selection
**Current Behavior**: Skill order applies globally to all venues and years
**New Behavior**: Select specific venues and multiple years for each skill order

**Required Changes**:

#### Database Schema Updates:
```sql
-- Create junction table for skill order venues
CREATE TABLE IF NOT EXISTS skill_order_venues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  skill_order_id INT NOT NULL,
  venue_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (skill_order_id) REFERENCES skill_order(id) ON DELETE CASCADE,
  FOREIGN KEY (venue_id) REFERENCES venue(venue_id) ON DELETE CASCADE,
  UNIQUE KEY unique_skill_venue (skill_order_id, venue_id)
);

-- Create junction table for skill order years
CREATE TABLE IF NOT EXISTS skill_order_years (
  id INT AUTO_INCREMENT PRIMARY KEY,
  skill_order_id INT NOT NULL,
  year VARCHAR(10) NOT NULL, -- 'I', 'II', 'III', 'IV'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (skill_order_id) REFERENCES skill_order(id) ON DELETE CASCADE,
  UNIQUE KEY unique_skill_year (skill_order_id, year)
);
```

#### Backend Updates:
**File**: `server/controllers/skillOrder.controller.js`

1. **Modify `saveSkillOrder` function**:
```javascript
export const saveSkillOrder = async (req, res) => {
  const { skills, venue_ids, years } = req.body; // Add venue_ids and years
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 1. Save skill order
    const [result] = await connection.execute(
      'INSERT INTO skill_order (course_type_id, skills_json, created_by) VALUES (?, ?, ?)',
      [courseTypeId, JSON.stringify(skills), req.user.user_id]
    );
    
    const skillOrderId = result.insertId;
    
    // 2. Save venue associations
    if (venue_ids && venue_ids.length > 0) {
      const venueValues = venue_ids.map(vid => [skillOrderId, vid]);
      await connection.query(
        'INSERT INTO skill_order_venues (skill_order_id, venue_id) VALUES ?',
        [venueValues]
      );
    }
    
    // 3. Save year associations
    if (years && years.length > 0) {
      const yearValues = years.map(year => [skillOrderId, year]);
      await connection.query(
        'INSERT INTO skill_order_years (skill_order_id, year) VALUES ?',
        [yearValues]
      );
    }
    
    await connection.commit();
    res.json({ success: true, skillOrderId });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
};
```

2. **Modify `getSkillOrder` function**:
```javascript
export const getSkillOrder = async (req, res) => {
  try {
    // Get skill order with venue and year info
    const [orders] = await db.query(`
      SELECT 
        so.*,
        GROUP_CONCAT(DISTINCT sov.venue_id) as venue_ids,
        GROUP_CONCAT(DISTINCT v.venue_name) as venue_names,
        GROUP_CONCAT(DISTINCT soy.year) as years
      FROM skill_order so
      LEFT JOIN skill_order_venues sov ON so.id = sov.skill_order_id
      LEFT JOIN venue v ON sov.venue_id = v.venue_id
      LEFT JOIN skill_order_years soy ON so.id = soy.skill_order_id
      WHERE so.course_type_id = ?
      GROUP BY so.id
      ORDER BY so.created_at DESC
      LIMIT 1
    `, [courseTypeId]);
    
    if (orders.length > 0) {
      const order = orders[0];
      order.venue_ids = order.venue_ids ? order.venue_ids.split(',').map(Number) : [];
      order.venue_names = order.venue_names ? order.venue_names.split(',') : [];
      order.years = order.years ? order.years.split(',') : [];
    }
    
    res.json({ success: true, data: orders[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

#### Frontend Updates:
**File**: `Frontend/src/pages/SuperAdmin/SkillReports/SkillOrderManager.jsx`

1. **Add Venue and Year Selection UI**:
```jsx
const [selectedVenues, setSelectedVenues] = useState([]);
const [selectedYears, setSelectedYears] = useState([]);
const [venues, setVenues] = useState([]);

// Fetch venues
useEffect(() => {
  const fetchVenues = async () => {
    const response = await apiGet('/groups/venues');
    const data = await response.json();
    setVenues(data.data || []);
  };
  fetchVenues();
}, []);

// Add to save skill order dialog:
<div style={{ marginBottom: '20px' }}>
  <h4>Apply to Venues</h4>
  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
    <input 
      type="checkbox" 
      checked={selectedVenues.length === venues.length}
      onChange={(e) => {
        if (e.target.checked) {
          setSelectedVenues(venues.map(v => v.venue_id));
        } else {
          setSelectedVenues([]);
        }
      }}
    />
    <label>Select All Venues</label>
  </div>
  
  <select 
    multiple 
    value={selectedVenues}
    onChange={(e) => {
      const values = Array.from(e.target.selectedOptions, option => Number(option.value));
      setSelectedVenues(values);
    }}
    style={{ minHeight: '120px', width: '100%', padding: '8px' }}
  >
    {venues.map(venue => (
      <option key={venue.venue_id} value={venue.venue_id}>
        {venue.venue_name}
      </option>
    ))}
  </select>
  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
    {selectedVenues.length} venue(s) selected. Hold Ctrl/Cmd to select multiple.
  </div>
</div>

<div style={{ marginBottom: '20px' }}>
  <h4>Apply to Years</h4>
  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
    {['I', 'II', 'III', 'IV'].map(year => (
      <label key={year} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input 
          type="checkbox"
          checked={selectedYears.includes(year)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedYears([...selectedYears, year]);
            } else {
              setSelectedYears(selectedYears.filter(y => y !== year));
            }
          }}
        />
        Year {year}
      </label>
    ))}
  </div>
  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
    {selectedYears.length} year(s) selected
  </div>
</div>
```

2. **Update save function**:
```javascript
const handleSaveOrder = async () => {
  if (selectedVenues.length === 0) {
    alert('Please select at least one venue');
    return;
  }
  if (selectedYears.length === 0) {
    alert('Please select at least one year');
    return;
  }
  
  const response = await apiPost('/skill-order/save', {
    course_type_id: selectedCourseType,
    skills: orderedSkills,
    venue_ids: selectedVenues,
    years: selectedYears
  });
  
  // Handle response...
};
```

---

## Implementation Priority

1. ✅ **Year filtering in Skill Proficiency** - COMPLETED
2. **Year filtering in Task & Assignments** - Quick win, similar to skill proficiency
3. **Roadmap venue selection** - Medium complexity, requires DB changes
4. **Skill Order venue + year selection** - Higher complexity, requires junction tables

---

## Testing Checklist

### Year Filtering (Skill Proficiency)
- [ ] Filter shows correct students for each year (I, II, III, IV)
- [ ] "All Years" shows all students
- [ ] Pagination updates correctly with year filter
- [ ] Works in combination with status filters
- [ ] Works in combination with venue filter
- [ ] Statistics update correctly (excluding non-selected years)

### Roadmap Venue Selection
- [ ] Can select multiple venues when creating roadmap
- [ ] Can select all venues at once
- [ ] Shows which venues roadmap is published to
- [ ] Can add venues to existing roadmap
- [ ] Can remove venues from existing roadmap
- [ ] Students in selected venues see the roadmap
- [ ] Students in non-selected venues don't see the roadmap

### Skill Order Venue + Year Selection
- [ ] Can select multiple venues
- [ ] Can select multiple years
- [ ] Validation prevents saving without venue/year selection
- [ ] Skill order applies only to selected venues
- [ ] Skill order applies only to selected years
- [ ] Can update venue/year selection for existing orders
- [ ] Shows current venue/year assignments in UI

