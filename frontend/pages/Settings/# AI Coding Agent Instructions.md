# AI Coding Agent Instructions

## 1. Project Overview & Architecture
- **Stack**: React 19 (Vite), TypeScript, Tailwind CSS (CDN/Script-based), Node.js/Express Backend, Supabase (Auth, DB).
- **Architecture**: 
  - **Frontend-First**: The React app communicates directly with Supabase for most data operations (Auth, CRUD).
  - **Backend**: A lightweight Node.js/Express service (`backend/`) primarily for specific server-side tasks or proxying, but the frontend is the main driver.
  - **Database**: Supabase (PostgreSQL) with Row Level Security (RLS).
- **Key Directories**:
  - `frontend/`: Main React application.
  - `backend/`: Node.js server and Supabase migrations.
  - `frontend/services/`: Contains API logic. **Note**: `vapiService.ts` currently handles Supabase data fetching and mock data fallbacks.

## 2. Critical Developer Workflows
- **Frontend Development**:
  - Run: `npm run dev` (in `frontend/`).
  - Build: `npm run build`.
- **Backend Development**:
  - Run: `node index.js` (in `backend/`).
- **Database Management**:
  - Migrations are stored in `backend/supabase/migrations/`.
  - Apply migrations via Supabase Dashboard SQL Editor (copy-paste content).
- **Environment Setup**:
  - Frontend requires `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## 3. Codebase Conventions & Patterns
- **Data Fetching Strategy (Hybrid Mock/Real)**:
  - **Pattern**: `frontend/services/vapiService.ts` implements a "Supabase First, Mock Fallback" strategy.
  - **Rule**: When implementing data fetchers, always try to fetch from Supabase first. If it fails (or returns empty/error), return the corresponding `MOCK_*` constant.
  - **Example**:
    ```typescript
    export const getVoices = async (): Promise<Voice[]> => {
        try {
            const { data, error } = await supabase.from('voices').select('*');
            if (error) throw error;
            return mapDataToType(data);
        } catch (error) {
            console.error('Supabase error, using mock:', error);
            return MOCK_VOICES;
        }
    };
    ```

- **Styling (Non-Standard Tailwind)**:
  - **Configuration**: Tailwind is configured via a `<script>` tag in `frontend/index.html`, NOT `tailwind.config.js`.
  - **Custom Colors**: Defined in `index.html` (e.g., `primary: '#2EC7B7'`, `surface: '#1B1E23'`).
  - **Rule**: Do not look for `tailwind.config.js` to modify themes. Edit `frontend/index.html` instead.

- **Routing**:
  - Uses `react-router-dom` v7.

- **Icons**:
  - Use `lucide-react` for all icons.

## 4. Integration Points
- **Supabase**:
  - Client initialized in `frontend/services/supabase.ts`.
  - Tables: `voices`, `assistants`, `phone_numbers`, `api_keys`, `call_logs`, `customers`.
  - **RLS**: Always assume RLS is active; queries are scoped to the authenticated user (`user_id`).

- **Vapi Integration**:
  - While named `vapiService.ts`, this file currently acts as the primary data layer for the dashboard entities.

## 5. Common Pitfalls to Avoid
- **Tailwind Config**: Do not try to add plugins or theme extensions in a `tailwind.config.js` file; it won't work. Use the script tag in `index.html`.
- **Service Naming**: Don't be confused by `vapiService.ts` handling generic database entities (Customers, Call Logs). This is the current convention.
- **Import Maps**: Note the `<script type="importmap">` in `index.html`. Ensure new dependencies are compatible or properly handled by Vite.