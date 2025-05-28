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