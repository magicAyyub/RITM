import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Helper function to handle API calls
export async function fetchFromAPI(endpoint: string) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/insights${endpoint}`);
        if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching from ${endpoint}:`, error);
        throw error;
    }
}

// Execute custom SQL query
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const response = await fetch(`${API_BASE_URL}/api/v1/insights/execute-query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        
        if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error executing query:', error);
        return NextResponse.json(
            { error: 'Failed to execute query' },
            { status: 500 }
        );
    }
}

// Get top operators
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    try {
        let data;
        switch (endpoint) {
            case 'top-operators':
                data = await fetchFromAPI('/top-operators');
                break;
            case 'monthly-stats':
                data = await fetchFromAPI('/monthly-stats');
                break;
            case 'weekly-patterns':
                data = await fetchFromAPI('/weekly-patterns');
                break;
            case 'activity-gaps':
                data = await fetchFromAPI('/activity-gaps');
                break;
            case 'operator-dashboard':
                data = await fetchFromAPI('/operator-dashboard');
                break;
            case 'anomalies':
                data = await fetchFromAPI('/anomalies');
                break;
            case 'geographic-analysis':
                data = await fetchFromAPI('/geographic-analysis');
                break;
            default:
                return NextResponse.json(
                    { error: 'Invalid endpoint' },
                    { status: 400 }
                );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        return NextResponse.json(
            { error: `Failed to fetch ${endpoint} data` },
            { status: 500 }
        );
    }
}

// Example usage:
// GET /api/insights?endpoint=top-operators
// GET /api/insights?endpoint=monthly-stats
// GET /api/insights?endpoint=weekly-patterns
// GET /api/insights?endpoint=activity-gaps
// GET /api/insights?endpoint=operator-dashboard
// GET /api/insights?endpoint=geographic-analysis
// POST /api/insights with body: { query: "SELECT * FROM prepared_data LIMIT 10" }
