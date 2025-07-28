import { useState, useEffect } from 'react'
import { fetchFromAPI } from '@/app/api/operators/route'

interface WeeklyPattern {
  lp_csid: string
  jour_semaine: number
  nom_jour: string
  jour: string
  nb_connexions: number
  nb_clients_uniques: number
  nb_ips_uniques: number
}

export function useWeeklyPatterns() {
  const [allPatterns, setAllPatterns] = useState<WeeklyPattern[]>([])
  const [inAppPatterns, setInAppPatterns] = useState<WeeklyPattern[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPatterns = async () => {
    try {
      setLoading(true)
      const [allData, inAppData] = await Promise.all([
        fetchFromAPI('/weekly-patterns?in_app_only=false'),
        fetchFromAPI('/weekly-patterns?in_app_only=true')
      ])

      setAllPatterns(allData.weekly_patterns || [])
      setInAppPatterns(inAppData.weekly_patterns || [])
    } catch (error) {
      console.error('Error fetching weekly patterns:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPatterns()
  }, [])

  const getPatterns = (inAppOnly: boolean) => {
    return inAppOnly ? inAppPatterns : allPatterns
  }

  const getFormattedData = (inAppOnly: boolean) => {
    return getPatterns(inAppOnly).map(item => ({
      ...item,
      jour_formate: item.jour
        ? new Date(item.jour).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })
        : ''
    }))
  }

  const getExportData = (inAppOnly: boolean) => {
    return getPatterns(inAppOnly).map(pattern => ({
      'Date': new Date(pattern.jour).toLocaleDateString('fr-FR'),
      'Jour': pattern.nom_jour,
      'ID Opérateur': pattern.lp_csid,
      'Nombre de connexions': pattern.nb_connexions,
      'Clients uniques': pattern.nb_clients_uniques,
      'IPs uniques': pattern.nb_ips_uniques
    }))
  }

  return {
    allPatterns,
    inAppPatterns,
    loading,
    getPatterns,
    getFormattedData,
    getExportData,
    refetch: fetchPatterns
  }
}
