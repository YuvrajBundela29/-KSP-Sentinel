# KSP Sentinel AI — Demo Script

## Getting Started

1. Open the application in the browser
2. The login page will appear with the KSP Sentinel AI branding

## Step 1: Login

- **Username:** `investigator`
- **Password:** `ksp123`
- Click "Sign In"

> Alternatively, use `analyst/ksp123` or `admin/ksp123`

## Step 2: Dashboard

After login, you will see the main dashboard with:

- **6 Stat Cards:** Total FIRs (20), Active Cases, Arrested Accused, High Risk Offenders, Districts Covered, Gang Networks
- **Bar Chart:** FIRs by Crime Type distribution
- **Recent FIRs:** 5 most recent crime records
- **High Risk Accused Table:** Click any name to view their detailed profile

**Things to point out:**
- All data is loaded from the JSON dataset — no hardcoded numbers
- Risk scores are color-coded (red > 80, orange > 60)

## Step 3: AI Copilot

1. Click "AI Copilot" in the sidebar
2. Click one of the 5 example query buttons, or type your own query
3. Suggested queries to try:
   - "Show all chain snatching cases in Mysuru"
   - "Who are the members of the Silk City Gang?"
   - "Which accused has the highest risk score?"
   - "Are there patterns in vehicle theft crimes?"
   - "Show financial links in jewellery heist cases"
4. The Evidence Panel on the right will auto-populate with referenced FIRs
5. Try the microphone button for voice input (click EN/KN to switch language)
6. Click "Export PDF" to download the chat as an intelligence briefing

## Step 4: Network Graph

1. Click "Network Graph" in the sidebar
2. You will see an interactive force-directed graph of criminal connections
3. **Filter by crime type:** Use the dropdown to filter (e.g., select "Chain Snatching")
4. **Filter by gang:** Select a gang to see only that network
5. **Click any node** to see detailed info in the right panel:
   - Red circles = Accused (bigger = higher risk)
   - Orange hexagons = Gangs
   - Yellow squares = FIRs
   - Cyan triangles = Vehicles
   - Purple circles = Districts
6. **Drag nodes** to rearrange the graph
7. **Hover** for quick info tooltips

## Step 5: Crime Map

1. Click "Crime Map" in the sidebar
2. A map of Karnataka appears with crime markers
3. **Marker colors:** Red = Critical, Orange = High, Yellow = Medium
4. **Click any marker** to see FIR details in a popup
5. Use the **left filter panel** to:
   - Toggle crime types on/off
   - Filter by year
   - Filter by severity
6. The **right stats panel** shows top 3 districts and most common crime type
7. Below the map is a district summary table sorted by crime count

## Step 6: Accused Profile

1. From the Dashboard, click any accused name in the High Risk table
2. Or navigate to a profile from the Network Graph by clicking an accused node
3. The profile page shows:
   - **Header:** Name, risk gauge, gang badge
   - **Criminal Timeline:** All FIRs with a vertical timeline
   - **Behavioral Analysis:** Preferred time, crime type, districts, vehicles, associates
   - **Risk Breakdown:** Table explaining how the risk score was calculated
   - **Financial Connections:** Bank accounts and transactions
   - **AI Analysis:** Auto-generated behavioral summary

## Step 7: Language Toggle

- Click the "ಕನ್ನಡ / English" button in the header to toggle UI labels between Kannada and English
- Sidebar items will switch: Dashboard ↔ ಮುಖಪುಟ, AI Copilot ↔ AI ಸಹಾಯಕ, etc.

## Notes

- All data is **synthetic and fictional** (DEMO MODE badge on login)
- The app works entirely on localhost with no external API dependencies
- Voice input uses the browser's Web Speech API (works best in Chrome)
- PDF export generates a downloadable intelligence briefing document