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
import { ChevronUpDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline"
import { downloadCSV } from "@/lib/exportUtils"
import { Button } from "@/components/Button"
import { WeeklyPatternsChart } from "@/components/charts/WeeklyPatternsChart"
import { useDashboardData } from "@/hooks/useDashboardData"

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
  const [timeRange, setTimeRange] = useState<'7j' | '30j' | '90j'>('30j')
  const [topLimit, setTopLimit] = useState(10)
  const [showAllGaps, setShowAllGaps] = useState(false)
  const [showAllAnomalies, setShowAllAnomalies] = useState(false)
  const [sortByPause, setSortByPause] = useState<'asc' | 'desc'>('desc')
  const [showInAppOnly, setShowInAppOnly] = useState(() => {
    // Persister le filtre dans localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboardFilterInAppOnly')
      return saved ? JSON.parse(saved) : false
    }
    return false
  })
  const [showBackToTop, setShowBackToTop] = useState(false)

  // Sauvegarder le state du filtre dans localStorage quand il change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboardFilterInAppOnly', JSON.stringify(showInAppOnly))
      console.log('Dashboard: Filtre sauvegardé:', showInAppOnly)
    }
  }, [showInAppOnly])

  // Debug pour surveiller les changements
  useEffect(() => {
    console.log('Dashboard: showInAppOnly changé:', showInAppOnly)
  }, [showInAppOnly])

  // Utilise notre hook personnalisé pour récupérer toutes les données
  const { data, loading } = useDashboardData(topLimit, showInAppOnly)

  // Effet pour détecter le scroll et afficher le bouton back to top
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Fonction pour remonter en haut
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  // Loader pour les métriques
  const renderMetricLoader = () => (
    <div className="flex items-center justify-center h-24">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  )

  // Loader pour les graphiques
  const renderChartLoader = () => (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  )

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
      {/* Header avec Filtre Global intégré */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
        <div>
          <Title className="text-xl">Dashboard Opérateurs</Title>
          <Text className="text-sm text-gray-600">Vue d&apos;ensemble de l&apos;activité des opérateurs</Text>
        </div>
        <div className="flex items-center gap-3">
          <Text className="text-sm font-medium text-gray-700">Affichage:</Text>
          <div className="flex bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setShowInAppOnly(false)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                !showInAppOnly 
                  ? 'bg-blue-500 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50 cursor-pointer'
              }`}
            >
              Toutes les connexions
            </button>
            <button
              onClick={() => setShowInAppOnly(true)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                showInAppOnly 
                  ? 'bg-blue-500 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              IN App uniquement
            </button>
          </div>
        </div>
      </div>

      {/* Header avec KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-2">
            <Title>Opérateurs</Title>
            {showInAppOnly && (
              <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                IN App
              </div>
            )}
          </div>
          {loading ? renderMetricLoader() : (
            <>
              <Metric>{totalOperators}</Metric>
              <Text>Total enregistrés{showInAppOnly ? ' (IN App)' : ''}</Text>
            </>
          )}
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <Title>Connexions</Title>
            {showInAppOnly && (
              <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                IN App
              </div>
            )}
          </div>
          {loading ? renderMetricLoader() : (
            <>
              <Metric>{totalConnections.toLocaleString()}</Metric>
              <Text>Total historique{showInAppOnly ? ' (IN App)' : ' (hors domaine docaposte.com)'}</Text>
            </>
          )}
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <Title>Moyenne/Opérateur</Title>
            {showInAppOnly && (
              <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                IN App
              </div>
            )}
          </div>
          {loading ? renderMetricLoader() : (
            <>
              <Metric>{avgConnectionsPerOperator.toLocaleString()}</Metric>
              <Text>Connexions moyennes{showInAppOnly ? ' (IN App)' : ''}</Text>
            </>
          )}
        </Card>
      </div>

      {/* Section Top Opérateurs */}
      <Card>
        {loading ? renderChartLoader() : (
          <>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Title>Top Opérateurs</Title>
                {showInAppOnly && (
                  <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                    IN App
                  </div>
                )}
              </div>
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
                    `top-operateurs${showInAppOnly ? '-in-app' : ''}`
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
          </>
        )}
      </Card>

      {/* Analyse Temporelle */}
      <Card>
        {loading ? renderChartLoader() : (
          <>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Title>Analyse Temporelle</Title>
                {showInAppOnly && (
                  <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                    IN App
                  </div>
                )}
              </div>
              <ExportButton 
                onClick={() => downloadCSV(
                  monthlyActivityData.map(stat => ({
                    'Mois': stat.mois,
                    'Nombre de connexions': stat.nb_connexions
                  })),
                  `activite-mensuelle${showInAppOnly ? '-in-app' : ''}`
                )} 
              />
            </div>
            <Tabs defaultValue="mensuelle">
              <TabsList>
                <TabsTrigger value="mensuelle">Mensuelle</TabsTrigger>
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
            </Tabs>
          </>
        )}
      </Card>

      {/* Patterns d'Activité Hebdomadaire */}
      <WeeklyPatternsChart 
        showInAppOnly={showInAppOnly}
      />

      {/* Analyse Géographique */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Title>Répartition Géographique</Title>
            {showInAppOnly && (
              <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                IN App
              </div>
            )}
          </div>
          <ExportButton 
            onClick={() => downloadCSV(
              geoDistributionData.map(geo => ({
                'Pays': geo.country,
                'Nombre de connexions': geo.value
              })),
              `repartition-geographique${showInAppOnly ? '-in-app' : ''}`
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
          <div className="flex items-center gap-2">
            <Title>Pauses d&apos;Activité</Title>
            <button
              onClick={() => setSortByPause(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-1 text-sm hover:bg-gray-100 rounded"
              title="Trier par plus longue pause"
            >
              <ChevronUpDownIcon className="w-4 h-4" />
            </button>
          </div>
          <ExportButton 
            onClick={() => {
              const sortedGaps = data.activity_gaps
                .sort((a, b) => sortByPause === 'asc' ? a.plus_longue_pause - b.plus_longue_pause : b.plus_longue_pause - a.plus_longue_pause)
                .map(gap => ({
                  'ID Opérateur': gap.lp_csid,
                  'Nombre de pauses': gap.nb_pauses_detectees,
                  'Durée moyenne (jours)': gap.duree_moyenne_pause,
                  'Plus longue pause (jours)': gap.plus_longue_pause,
                  'Détail des pauses': gap.detail_pauses
                }));
              downloadCSV(sortedGaps, 'pauses-activite');
            }}
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
          {data.activity_gaps
            .sort((a, b) => sortByPause === 'asc' ? a.plus_longue_pause - b.plus_longue_pause : b.plus_longue_pause - a.plus_longue_pause)
            .map((operator, index) => (
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

      {/* Bouton Back to Top */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl"
          title="Remonter en haut pour accéder au filtre"
        >
          <ChevronUpIcon className="w-6 h-6" />
        </button>
      )}
    </div>
  )
}