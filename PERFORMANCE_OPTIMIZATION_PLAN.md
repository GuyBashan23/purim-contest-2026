# 🚀 Performance Optimization Plan

**Target:** 100-200 concurrent users uploading photos and voting simultaneously

---

## 🔴 CRITICAL ISSUES

### 1. **No Client-Side Image Compression** (CRITICAL)
**Impact:** Users uploading 10MB photos will kill bandwidth and storage
**Location:** `components/upload-form.tsx`, `components/admin/manual-upload-modal.tsx`
**Fix:** Implement client-side compression using Canvas API before upload
**Expected Improvement:** 70-90% reduction in upload size

### 2. **Gallery Loads ALL Entries** (CRITICAL)
**Impact:** Loading 100+ images at once will crash mobile browsers
**Location:** `components/costume-gallery.tsx`
**Fix:** Implement pagination or infinite scroll
**Expected Improvement:** 80% reduction in initial load time

### 3. **SELECT * Queries** (HIGH)
**Impact:** Fetching unnecessary data (description, created_at) wastes bandwidth
**Location:** Multiple components
**Fix:** Select only required fields
**Expected Improvement:** 30-50% reduction in query payload

---

## 🟡 HIGH PRIORITY

### 4. **No React.memo on Components** (HIGH)
**Impact:** Unnecessary re-renders on every vote update
**Location:** `components/bar-chart-race.tsx`, `components/leaderboard-chart.tsx`
**Fix:** Memoize components and sorted lists
**Expected Improvement:** 60% reduction in re-renders

### 5. **Full Page Re-renders on Vote Updates** (HIGH)
**Impact:** Entire gallery re-renders when one vote changes
**Location:** Real-time subscriptions trigger full fetches
**Fix:** Optimize subscriptions to only update changed entries
**Expected Improvement:** 70% reduction in render time

### 6. **Image sizes Prop Not Optimized** (MEDIUM)
**Impact:** Mobile users downloading desktop-sized images
**Location:** `components/costume-gallery.tsx`
**Fix:** Better sizes prop based on viewport
**Expected Improvement:** 50% reduction in image download size on mobile

---

## 🟢 MEDIUM PRIORITY

### 7. **No Debouncing on Real-time Updates** (MEDIUM)
**Impact:** Too many rapid updates cause jank
**Location:** `components/bar-chart-race.tsx` (has debounce, but could be better)
**Fix:** Improve debouncing strategy
**Expected Improvement:** Smoother animations

### 8. **No Virtual Scrolling** (MEDIUM)
**Impact:** Rendering 100+ DOM elements at once
**Location:** `components/costume-gallery.tsx`
**Fix:** Implement virtual scrolling (react-window)
**Expected Improvement:** 90% reduction in DOM nodes

---

## 📋 IMPLEMENTATION CHECKLIST

- [x] Create image compression utility
- [ ] Integrate compression in upload forms
- [ ] Add pagination to gallery
- [ ] Optimize SELECT queries
- [ ] Add React.memo to components
- [ ] Optimize real-time subscriptions
- [ ] Improve image sizes props
- [ ] Add virtual scrolling (optional)

---

## 📊 EXPECTED RESULTS

**Before:**
- Initial load: 5-10 seconds (100 entries)
- Upload time: 10-30 seconds (10MB photo)
- Re-render time: 200-500ms per vote

**After:**
- Initial load: 1-2 seconds (20 entries, paginated)
- Upload time: 2-5 seconds (compressed 1MB photo)
- Re-render time: 50-100ms per vote

**Bandwidth Savings:** ~85% reduction
**Memory Usage:** ~70% reduction
**Render Performance:** ~75% improvement
