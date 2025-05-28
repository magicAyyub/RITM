"use client"

import { useEffect, useState } from "react"
import { AreaChart } from "@/components/ui/AreaChart"
import { BarChart } from "@/components/ui/BarChart"
import { Card } from "@/components/ui/Card"
import { Title } from "@/components/ui/Title"
import { Metric } from "@/components/ui/Metric"
import { Text } from "@/components/ui/Text"
import { Tracker } from "@/components/ui/Tracker"
import { OperatorId } from "@/components/ui/OperatorId"
import { fetchFromAPI } from "./api/insights/route"

interface OperatorData {
  lp_csid: string
  nb_clients_total: number
  nb_connexions_total: number
  nb_pays_total: number
  statut_activite: string
}

interface ActivityGap {
  lp_csid: string
  nb_pauses_detectees: number
  duree_moyenne_pause: number
  plus_longue_pause: number
  detail_pauses: string
}

interface WeeklyPattern {
  lp_csid: string
  jour_semaine: number
  nom_jour: string
  jour: string
  nb_connexions: number
  nb_clients_uniques: number
  nb_ips_uniques: number
}

interface Anomaly {
  lp_csid: string
  date: string
  nb_connexions: number
  nb_clients: number
  type_anomalie: string
  variation_pourcentage: number
  moyenne_connexions: number
}

export default function Home() {
  const [data, setData] = useState<{
    monthly_stats: any[]
    weekly_patterns: WeeklyPattern[]
    activity_gaps: ActivityGap[]
    operator_dashboard: OperatorData[]
    anomalies: Anomaly[]
  }>({
    monthly_stats: [],
    weekly_patterns: [],
    activity_gaps: [],
    operator_dashboard: [],
    anomalies: []
  })

  const [showAllGaps, setShowAllGaps] = useState(false);
  const [showAllAnomalies, setShowAllAnomalies] = useState(false);
  const [topOperators, setTopOperators] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [monthlyStats, weeklyPatterns, activityGaps, operatorDashboard, anomalies] = await Promise.all([
          fetchFromAPI(`/monthly-stats/${topOperators}`),
          fetchFromAPI('/weekly-patterns'),
          fetchFromAPI('/activity-gaps'),
          fetchFromAPI('/operator-dashboard'),
          fetchFromAPI('/anomalies')
        ])

        setData({
          monthly_stats: monthlyStats.monthly_stats || [],
          weekly_patterns: weeklyPatterns.weekly_patterns || [],
          activity_gaps: activityGaps.activity_gaps || [],
          operator_dashboard: operatorDashboard.operator_dashboard || [],
          anomalies: anomalies.anomalies || []
        })
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error)
      }
    }

    fetchData()
  }, [topOperators])

  // Calculate KPIs
  const totalOperators = data.operator_dashboard.length
  const totalClients = data.operator_dashboard.reduce((acc, op) => acc + op.nb_clients_total, 0)
  const totalConnections = data.operator_dashboard.reduce((acc, op) => acc + op.nb_connexions_total, 0)
  const totalCountries = data.operator_dashboard.reduce((acc, op) => acc + op.nb_pays_total, 0)

  // Prepare weekly activity data
  const weeklyPatternsWithFormattedDate = data.weekly_patterns.map(item => ({
    ...item,
    jour_formate: item.jour
      ? new Date(item.jour).toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      : ''
  }));
  // Prepare activity gaps data for Tracker
  const getGapTrackerData = (operator: ActivityGap) => {
    const gaps = operator.detail_pauses.split('; ')
    return gaps.map((gap: string, index: number) => {
      const [dates, duration] = gap.split(' (')
      const days = parseInt(duration)
      return {
        key: index,
        color: days > 7 ? 'bg-red-500' : days > 3 ? 'bg-yellow-500' : 'bg-green-500',
        tooltip: `${dates} (${days} jours)`
      }
    })
  }

  // Prepare monthly activity data
  const monthlyActivityData = data.monthly_stats.reduce((acc: any[], stat: any) => {
    const month = new Date(stat.mois).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
    const existingMonth = acc.find(m => m.mois === month)
    if (existingMonth) {
      existingMonth.connexions += stat.nb_connexions
    } else {
      acc.push({
        mois: month,
        connexions: stat.nb_connexions
      })
    }
    return acc
  }, [])

  const displayedGaps = showAllGaps ? data.activity_gaps : data.activity_gaps.slice(0, 5);

  return (
    <div className="p-4 space-y-6">
      {/* En-tête avec métriques clés */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <Title>Total Opérateurs</Title>
          <Metric>{totalOperators}</Metric>
          <Text>Actifs dans le système</Text>
        </Card>
        <Card>
          <Title>Clients Uniques</Title>
          <Metric>{totalClients.toLocaleString()}</Metric>
          <Text>Sur tous les opérateurs</Text>
        </Card>
        <Card>
          <Title>Total Connexions</Title>
          <Metric>{totalConnections.toLocaleString()}</Metric>
          <Text>Activité totale du système</Text>
        </Card>
        <Card>
          <Title>Pays Actifs</Title>
          <Metric>{totalCountries}</Metric>
          <Text>Couverture géographique</Text>
        </Card>
      </div>

      {/* Évolution mensuelle de l'activité */}
      <Card>
        <Title>Évolution Mensuelle de l'Activité</Title>
        <Text className="text-sm text-gray-500 mb-4">
          Visualisation des tendances d'activité des {topOperators} opérateurs les plus actifs sur les 12 derniers mois. Les pics peuvent indiquer des anomalies ou des périodes d'activité intense.
        </Text>
        <select
              id="topOperators"
              value={topOperators}
              onChange={(e) => setTopOperators(Number(e.target.value))}
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[5, 10, 15, 20].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
        <AreaChart
          className="h-72 mt-4"
          data={monthlyActivityData}
          index="mois"
          categories={["connexions"]}
          colors={["blue"]}
          valueFormatter={(number: number) => number.toLocaleString()}
          showLegend={true}
          showGridLines={true}
        />
      </Card>

      <Card>
        <Title>Activité Hebdomadaire</Title>
        <Text>Visualisation de l'activité hebdomadaire des opérateurs sur les 8 dernières semaines.</Text>
        <AreaChart
          className="mt-6 h-80"
          data={weeklyPatternsWithFormattedDate}
          index="jour_formate"
          categories={['nb_connexions', 'nb_ips_uniques', 'nom_jour']}
          colors={['emerald']}
          showLegend={true}
          showYAxis
          showXAxis
          valueFormatter={(number: number) => number.toLocaleString()}
          yAxisWidth={50}
        />
    </Card>

      {/* Analyse des Pauses d'Activité */}
      <Card>
        <Title>Analyse des Pauses d'Activité</Title>
        <Text className="text-sm text-gray-500 mb-4">
          Visualisation des périodes d&apos;inactivité des opérateurs. Rouge = pause longue (&gt;7 jours), Jaune = pause moyenne (3-7 jours), Vert = pause courte (&lt;3 jours).
        </Text>
        <div className="space-y-4 mt-4 max-h-[600px] overflow-y-auto pr-2">
          {displayedGaps.map((operator: ActivityGap, index: number) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <OperatorId id={operator.lp_csid} className="font-medium" />
              </div>
              <Tracker
                data={getGapTrackerData(operator)}
                hoverEffect={true}
              />
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <Text>Pause Moyenne</Text>
                  <Metric className="text-lg">{operator.duree_moyenne_pause.toFixed(1)} jours</Metric>
                </div>
                <div>
                  <Text>Plus Longue Pause</Text>
                  <Metric className="text-lg">{operator.plus_longue_pause} jours</Metric>
                </div>
                <div>
                  <Text>Total Pauses</Text>
                  <Metric className="text-lg">{operator.nb_pauses_detectees}</Metric>
                </div>
              </div>
            </div>
          ))}
          {data.activity_gaps.length > 5 && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowAllGaps(!showAllGaps)}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
              >
                {showAllGaps ? "Voir moins" : "Voir plus"}
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Anomalies d'Activité */}
      <Card>
        <Title>Anomalies d&apos;Activité</Title>
        <Text className="text-sm text-gray-500 mb-4">
          Détection des pics et chutes d&apos;activité significatifs (plus de 2 écarts-types par rapport à la moyenne).
        </Text>
        <div className="space-y-4 mt-4 max-h-[600px] overflow-y-auto pr-2">
          {(showAllAnomalies ? data.anomalies : data.anomalies.slice(0, 5)).map((anomaly: Anomaly, index: number) => (
            <div key={index} className="border-b pb-4 last:border-b-0">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <OperatorId id={anomaly.lp_csid} className="font-medium" />
                  <Text className="text-sm text-gray-500">
                    {new Date(anomaly.date).toLocaleDateString('fr-FR', { 
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </Text>
                </div>
                <div className={`px-2 py-1 rounded text-sm ${
                  anomaly.type_anomalie === 'Pic d\'activité' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {anomaly.type_anomalie}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <Text>Connexions</Text>
                  <Metric className="text-lg">{anomaly.nb_connexions.toLocaleString()}</Metric>
                </div>
                <div>
                  <Text>Moyenne Usuelle</Text>
                  <Metric className="text-lg">{anomaly.moyenne_connexions.toLocaleString()}</Metric>
                </div>
                <div>
                  <Text>Variation</Text>
                  <Metric className={`text-lg ${
                    anomaly.variation_pourcentage > 0 
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {anomaly.variation_pourcentage > 0 ? '+' : ''}{anomaly.variation_pourcentage}%
                  </Metric>
                </div>
              </div>
            </div>
          ))}
        </div>
        {data.anomalies.length > 5 && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setShowAllAnomalies(!showAllAnomalies)}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
            >
              {showAllAnomalies ? "Voir moins" : "Voir plus"}
            </button>
          </div>
        )}
      </Card>
    </div>
  )
}
