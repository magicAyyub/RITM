import { useState, useEffect } from 'react'
import { fetchFromAPI } from '@/app/api/operators/route'

interface DashboardData {
  operator_dashboard: any[]
  monthly_stats: any[]
  activity_gaps: any[]
  top_operators: any[]
  geo_distributions: any[]
  anomalies: any[]
}

export function useDashboardData(topLimit: number, showInAppOnly: boolean) {
  const [data, setData] = useState<DashboardData>({
    operator_dashboard: [],
    monthly_stats: [],
    activity_gaps: [],
    top_operators: [],
    geo_distributions: [],
    anomalies: []
  })
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [
        operatorDashboard,
        monthlyStats,
        activityGaps,
        topOperators,
        geoDistributions,
        anomalies
      ] = await Promise.all([
        fetchFromAPI(`/operator-dashboard?in_app_only=${showInAppOnly}`),
        fetchFromAPI(`/monthly-stats?top_x=${topLimit}&in_app_only=${showInAppOnly}`),
        fetchFromAPI('/activity-gaps'), // Pas de filtre IN App pour les pauses
        fetchFromAPI(`/top-operators?limit=${topLimit}&in_app_only=${showInAppOnly}`),
        fetchFromAPI(`/geo-distributions?in_app_only=${showInAppOnly}`),
        fetchFromAPI('/anomalies') // Pas de filtre IN App pour les anomalies
      ])

      setData({
        operator_dashboard: operatorDashboard.operator_dashboard || [],
        monthly_stats: monthlyStats.monthly_stats || [],
        activity_gaps: activityGaps.activity_gaps || [],
        top_operators: topOperators || [],  
        geo_distributions: geoDistributions || [],
        anomalies: anomalies.anomalies || []
      })
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [topLimit, showInAppOnly])

  return { data, loading, refetch: fetchData }
}
