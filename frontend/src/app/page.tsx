"use client"

import { useEffect, useState } from "react"
import { AreaChart} from "@/components/ui/AreaChart"
import { BarChart } from "@/components/ui/BarChart"
import { DonutChart } from "@/components/ui/DonutChart"
import { Tracker } from "@/components/ui/Tracker"
import { Metric } from "@/components/ui/Metric"
import { Text } from "@/components/ui/Text"
import { Title } from "@/components/ui/Title"
import { Card } from "@/components/Card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/Tabs"
import { OperatorId } from "@/components/ui/OperatorId"
// tabs go here
import { fetchFromAPI } from "./api/operators/route"
import { ExportButton } from "@/components/ui/ExportButton"
import { downloadCSV } from "@/lib/exportUtils"

interface OperatorData {
  lp_csid: string
  nb_connexions_total: number
  premiere_activite: string
  derniere_activite: string
  statut_activite: string
  anciennete: string
}

interface MonthlyStat {
  mois: string
  lp_csid: string
  nb_connexions: number
  rank_mois: number
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

interface ActivityGap {
  lp_csid: string
  nb_pauses_detectees: number
  duree_moyenne_pause: number
  plus_longue_pause: number
  detail_pauses: string
}

interface TopOperator {
  lp_csid: string
  count: number
  unique_ips: number
  unique_clients: number
}

interface GeoDistribution {
  lp_csid: string
  country: string
  nb_connexions: number
}

interface Anomaly {
  lp_csid: string
  date: string
  nb_connexions: number
  moyenne_connexions: number
  variation_pourcentage: number
  type_anomalie: string
}

export default function Dashboard() {
  const [data, setData] = useState<{
    operator_dashboard: OperatorData[]
    monthly_stats: MonthlyStat[]
    weekly_patterns: WeeklyPattern[]
    activity_gaps: ActivityGap[]
    top_operators: TopOperator[]
    geo_distributions: GeoDistribution[]
    anomalies: Anomaly[]
  }>({
    operator_dashboard: [],
    monthly_stats: [],
    weekly_patterns: [],
    activity_gaps: [],
    top_operators: [],
    geo_distributions: [],
    anomalies: []
  })

  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7j' | '30j' | '90j'>('30j')
  const [topLimit, setTopLimit] = useState(10)
  const [showAllGaps, setShowAllGaps] = useState(false)
  const [showAllAnomalies, setShowAllAnomalies] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        const [
          operatorDashboard,
          monthlyStats,
          weeklyPatterns,
          activityGaps,
          topOperators,
          geoDistributions,
          anomalies
        ] = await Promise.all([
          fetchFromAPI('/operator-dashboard'),
          fetchFromAPI(`/monthly-stats?top_x=${topLimit}`),
          fetchFromAPI('/weekly-patterns'),
          fetchFromAPI('/activity-gaps'),
          fetchFromAPI(`/top-operators?limit=${topLimit}`),
          fetchFromAPI('/geo-distributions'),
          fetchFromAPI('/anomalies')
        ])

        setData({
          operator_dashboard: operatorDashboard.operator_dashboard || [],
          monthly_stats: monthlyStats.monthly_stats || [],
          weekly_patterns: weeklyPatterns.weekly_patterns || [],
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

    fetchData()
  }, [topLimit, timeRange, showAllGaps, showAllAnomalies])

  // Calcul des KPI
  const totalOperators = data.operator_dashboard.length
  const totalConnections = data.operator_dashboard.reduce((acc, op) => acc + op.nb_connexions_total, 0)
  const avgConnectionsPerOperator = totalOperators > 0 ? Math.round(totalConnections / totalOperators) : 0

  // Préparation des données pour les graphiques
  const topOperatorsData = data.top_operators.map(op => ({
    name: op.lp_csid.substring(0, 8) + '...',
    value: op.count,
    uniqueIps: op.unique_ips,
    uniqueClients: op.unique_clients
  }))

  // Agrégation des données mensuelles par mois uniquement
  const monthlyActivityData = data.monthly_stats.reduce((acc: any[], stat) => {
    const month = new Date(stat.mois).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
    const existing = acc.find(item => item.mois === month)
    
    if (existing) {
      existing.nb_connexions += stat.nb_connexions
    } else {
      acc.push({
        mois: month,
        nb_connexions: stat.nb_connexions
      })
    }
    return acc
  }, []).sort((a, b) => new Date(a.mois).getTime() - new Date(b.mois).getTime())

  // Agrégation des données hebdomadaires par jour uniquement
  const weeklyPatternsByDay = data.weekly_patterns.reduce((acc: any[], pattern) => {
    const day = pattern.nom_jour
    const existing = acc.find(item => item.jour === day)
    
    if (existing) {
      existing.nb_connexions += pattern.nb_connexions
      existing.nb_clients_uniques += pattern.nb_clients_uniques
      existing.nb_ips_uniques += pattern.nb_ips_uniques
    } else {
      acc.push({
        jour: day,
        nb_connexions: pattern.nb_connexions,
        nb_clients_uniques: pattern.nb_clients_uniques,
        nb_ips_uniques: pattern.nb_ips_uniques,
        jour_semaine: pattern.jour_semaine
      })
    }
    return acc
  }, []).sort((a, b) => a.jour_semaine - b.jour_semaine)

  // Agrégation des données géographiques par pays uniquement
  const geoDistributionData = data.geo_distributions.reduce((acc: any[], geo) => {
    const existing = acc.find(item => item.country === geo.country)
    
    if (existing) {
      existing.value += geo.nb_connexions
    } else {
      acc.push({
        country: geo.country,
        value: geo.nb_connexions
      })
    }
    return acc
  }, []).sort((a, b) => b.value - a.value) // Tri par nombre de connexions décroissant

  // Agrégation des anomalies par date et type
  const aggregatedAnomalies = data.anomalies.reduce((acc: any[], anomaly) => {
    const date = new Date(anomaly.date).toLocaleDateString('fr-FR')
    const existing = acc.find(item => item.date === date && item.type_anomalie === anomaly.type_anomalie)
    
    if (existing) {
      existing.nb_connexions += anomaly.nb_connexions
      existing.moyenne_connexions = (existing.moyenne_connexions + anomaly.moyenne_connexions) / 2
      existing.variation_pourcentage = (existing.variation_pourcentage + anomaly.variation_pourcentage) / 2
      existing.operateurs = [...existing.operateurs, anomaly.lp_csid]
    } else {
      acc.push({
        date,
        type_anomalie: anomaly.type_anomalie,
        nb_connexions: anomaly.nb_connexions,
        moyenne_connexions: anomaly.moyenne_connexions,
        variation_pourcentage: anomaly.variation_pourcentage,
        operateurs: [anomaly.lp_csid]
      })
    }
    return acc
  }, []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const getGapTrackerData = (operator: ActivityGap) => {
    return operator.detail_pauses.split('; ').map((gap, index) => {
      const [dates, duration] = gap.split(' (')
      const days = parseInt(duration)
      return {
        key: index,
        color: days > 7 ? 'bg-red-500' : days > 3 ? 'bg-yellow-500' : 'bg-green-500',
        tooltip: `${dates} (${days} jours)`
      }
    })
  }

  const displayedGaps = showAllGaps ? data.activity_gaps : data.activity_gaps.slice(0, 5)
  const displayedAnomalies = showAllAnomalies ? aggregatedAnomalies : aggregatedAnomalies.slice(0, 5)

  return (
    <div className="p-6 space-y-6">
      {/* Header avec KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <Title>Opérateurs</Title>
          <Metric>{totalOperators}</Metric>
          <Text>Total enregistrés</Text>
        </Card>
        <Card>
          <Title>Connexions</Title>
          <Metric>{totalConnections.toLocaleString()}</Metric>
          <Text>Total historique (hors domaine docaposte.com)</Text>
        </Card>
        <Card>
          <Title>Moyenne/Opérateur</Title>
          <Metric>{avgConnectionsPerOperator.toLocaleString()}</Metric>
          <Text>Connexions moyennes</Text>
        </Card>
      </div>

      {/* Section Top Opérateurs */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <Title>Top Opérateurs</Title>
          <div className="flex items-center gap-2">
            <select
              value={topLimit}
              onChange={(e) => setTopLimit(Number(e.target.value))}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm"
            >
              {[5, 10, 15, 20].map(num => (
                <option key={num} value={num}>Top {num}</option>
              ))}
            </select>
            <ExportButton 
              onClick={() => downloadCSV(
                data.top_operators.map(op => ({
                  'ID Opérateur': op.lp_csid,
                  'Nombre de connexions': op.count,
                  'IPs uniques': op.unique_ips,
                  'Clients uniques': op.unique_clients
                })),
                'top-operateurs'
              )} 
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 items-center">
          <div className="lg:col-span-1">
            <BarChart
              data={topOperatorsData}
              index="name"
              categories={["value"]}
              colors={["blue"]}
              valueFormatter={(value) => value.toLocaleString()}
              yAxisWidth={80}
              showLegend={false}
              className="h-80"
            />
          </div>
        </div>
      </Card>

      {/* Analyse Temporelle */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <Title>Analyse Temporelle</Title>
          <ExportButton 
            onClick={() => downloadCSV(
              monthlyActivityData.map(stat => ({
                'Mois': stat.mois,
                'Nombre de connexions': stat.nb_connexions
              })),
              'activite-mensuelle'
            )} 
          />
        </div>
        <Tabs defaultValue="mensuelle">
          <TabsList>
            <TabsTrigger value="mensuelle">Mensuelle</TabsTrigger>
            <TabsTrigger value="hebdomadaire">Hebdomadaire</TabsTrigger>
          </TabsList>
          <TabsContent value="mensuelle">
            <AreaChart
              data={monthlyActivityData}
              index="mois"
              categories={["nb_connexions"]}
              colors={["blue"]}
              valueFormatter={(value) => value.toLocaleString()}
              showLegend={false}
              className="h-80 mt-4"
            />
          </TabsContent>
          <TabsContent value="hebdomadaire">
            <BarChart
              data={weeklyPatternsByDay}
              index="jour"
              categories={["nb_connexions"]}
              colors={["emerald"]}
              valueFormatter={(value) => value.toLocaleString()}
              showLegend={false}
              className="h-80 mt-4"
            />
          </TabsContent>
        </Tabs>
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <Title>Activité Hebdomadaire détaillée</Title>
          <ExportButton 
            onClick={() => downloadCSV(
              data.weekly_patterns.map(pattern => ({
                'Date': new Date(pattern.jour).toLocaleDateString('fr-FR'),
                'Jour': pattern.nom_jour,
                'ID Opérateur': pattern.lp_csid,
                'Nombre de connexions': pattern.nb_connexions,
                'Clients uniques': pattern.nb_clients_uniques,
                'IPs uniques': pattern.nb_ips_uniques
              })),
              'activite-hebdomadaire'
            )} 
          />
        </div>
        <Text className="text-sm text-gray-500 mb-4">
          Détail de l'activité par jour, avec connexions, clients uniques et IPs uniques. (Sur 8 semaines)
        </Text>
        <AreaChart
          className="mt-6 h-80"
          data={data.weekly_patterns.map(item => ({
            ...item,
            jour_formate: item.jour
              ? new Date(item.jour).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })
              : ''
          }))}
          index="jour_formate"
          categories={['nb_connexions', 'nb_clients_uniques', 'nb_ips_uniques']}
          colors={['blue', 'emerald', 'violet']}
          showLegend={true}
          showYAxis
          showXAxis
          valueFormatter={(number: number) => number.toLocaleString()}
          yAxisWidth={50}
        />
      </Card>

      {/* Analyse Géographique */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <Title>Répartition Géographique</Title>
          <ExportButton 
            onClick={() => downloadCSV(
              geoDistributionData.map(geo => ({
                'Pays': geo.country,
                'Nombre de connexions': geo.value
              })),
              'repartition-geographique'
            )} 
          />
        </div>
        <div className="flex items-start gap-8">
          <DonutChart
            data={geoDistributionData}
            category="country"
            value="value"
            valueFormatter={(value) => value.toLocaleString()}
            colors={["blue", "cyan", "lime", "violet", "fuchsia","amber", "pink"]}
            className="w-56 h-56"
          />
          <div className="flex-1">
            <div className="max-h-72 overflow-y-auto w-48">
              {geoDistributionData.map((geo, i) => (
                <div
                  key={geo.country}
                  className={`flex items-center gap-2 text-sm px-2 py-1 ${i % 2 === 0 ? 'bg-gray-50' : ''}`}
                >
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: ["#3b82f6", "#06b6d4", "#84cc16", "#a21caf", "#d946ef"][i % 5] }}
                  />
                  <span className="font-mono">{geo.country}</span>
                  <span className="ml-auto text-xs text-gray-500">{geo.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Analyse des Pauses */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <Title>Pauses d&apos;Activité</Title>
          <ExportButton 
            onClick={() => downloadCSV(
              data.activity_gaps.map(gap => ({
                'ID Opérateur': gap.lp_csid,
                'Nombre de pauses': gap.nb_pauses_detectees,
                'Durée moyenne (jours)': gap.duree_moyenne_pause,
                'Plus longue pause (jours)': gap.plus_longue_pause,
                'Détail des pauses': gap.detail_pauses
              })),
              'pauses-activite'
            )} 
          />
        </div>
        <Text className="mb-4">
          Visualisation des périodes d&apos;inactivité des opérateurs. 
          <span className="inline-flex items-center ml-2">
            <span className="w-3 h-3 bg-red-500 rounded-full mr-1"></span> Longue
            <span className="w-3 h-3 bg-yellow-500 rounded-full mx-2"></span> Moyenne
            <span className="w-3 h-3 bg-green-500 rounded-full ml-1"></span> Courte
          </span>
        </Text>
        
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {displayedGaps.map((operator, index) => (
            <div key={index} className="space-y-2 border-b pb-4 last:border-b-0">
              <div className="flex justify-between items-center">
                <OperatorId id={operator.lp_csid} className="font-medium" />
                <Text>{operator.nb_pauses_detectees} pauses détectées</Text>
              </div>
              <Tracker data={getGapTrackerData(operator)} />
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <Text>Moyenne</Text>
                  <Metric className="text-sm">{operator.duree_moyenne_pause.toFixed(1)} jours</Metric>
                </div>
                <div>
                  <Text>Plus longue</Text>
                  <Metric className="text-sm">{operator.plus_longue_pause} jours</Metric>
                </div>
                <div>
                  <Text>Total</Text>
                  <Metric className="text-sm">{operator.nb_pauses_detectees}</Metric>
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
        <div className="flex justify-between items-center mb-4">
          <Title>Anomalies d&apos;Activité</Title>
          <ExportButton 
            onClick={() => downloadCSV(
              displayedAnomalies.map(anomaly => ({
                'Date': anomaly.date,
                'Type d\'anomalie': anomaly.type_anomalie,
                'Nombre de connexions': anomaly.nb_connexions,
                'Moyenne habituelle': anomaly.moyenne_connexions,
                'Variation (%)': anomaly.variation_pourcentage,
                'Opérateurs concernés': anomaly.operateurs.join(', ')
              })),
              'anomalies'
            )} 
          />
        </div>
        <Text className="text-sm text-gray-500 mb-4">
          Détection des pics et chutes d&apos;activité significatifs (plus de 2 écarts-types par rapport à la moyenne).
        </Text>
        <div className="space-y-4 mt-4 max-h-[600px] overflow-y-auto pr-2">
          {displayedAnomalies.map((anomaly, index) => (
            <div key={index} className="border-b pb-4 last:border-b-0">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <Text className="font-medium">{anomaly.date}</Text>
                  <Text className="text-sm text-gray-500">
                    {anomaly.operateurs.length} opérateur(s) concerné(s)
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
        {aggregatedAnomalies.length > 5 && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setShowAllAnomalies(!showAllAnomalies)}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
            >
              {showAllAnomalies ? "Voir moins" : "Voir plus"}
            </button>
          </div>
        )}

        {aggregatedAnomalies.length === 0 && (
          <div className="text-center text-gray-500 mt-4">
            <Text>Aucune anomalie détectée pour le moment.</Text>
          </div>
        )}
      </Card>
    </div>
  )
}