"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/Card"
import { Title } from "@/components/ui/Title"
import { Metric } from "@/components/ui/Metric"
import { Text } from "@/components/ui/Text"
import { AreaChart } from "@/components/ui/AreaChart"
import { BarChart } from "@/components/ui/BarChart"
import { Tracker } from "@/components/ui/Tracker"
import { fetchFromAPI } from "../../api/insights/route"
import Link from "next/link"
import { ArrowLeftIcon } from "@heroicons/react/24/outline"

interface OperatorDetails {
  lp_csid: string
  nb_clients_total: number
  nb_connexions_total: number
  nb_pays_total: number
  statut_activite: string
  detail_pauses: string
  duree_moyenne_pause: number
  plus_longue_pause: number
  nb_pauses_detectees: number
  connexions_par_jour: Array<{
    date: string
    nb_connexions: number
  }>
  connexions_par_pays: Array<{
    pays: string
    nb_connexions: number
  }>
}

export default function OperatorPage({ params }: { params: { id: string } }) {
  const [operator, setOperator] = useState<OperatorDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOperatorData = async () => {
      try {
        const data = await fetchFromAPI(`/operateur/${params.id}`)
        setOperator(data)
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOperatorData()
  }, [params.id])

  if (loading) {
    return (
      <div className="p-4">
        <Text>Chargement des données...</Text>
      </div>
    )
  }

  if (!operator) {
    return (
      <div className="p-4">
        <Text>Opérateur non trouvé</Text>
      </div>
    )
  }

  // Prepare activity gaps data for Tracker
  const getGapTrackerData = () => {
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

  return (
    <div className="p-4 space-y-6">
      {/* En-tête avec navigation */}
      <div className="flex justify-between items-center">
        <Link 
          href="/"
          className="text-blue-500 hover:text-blue-700 flex items-center gap-1"
        >
          <ArrowLeftIcon className="w-4 h-4" /> Retour au tableau de bord
        </Link>
        <Text className="text-sm text-gray-500">
          ID: {operator.lp_csid}
        </Text>
      </div>

      {/* Métriques clés */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <Title>Clients Totaux</Title>
          <Metric>{operator.nb_clients_total.toLocaleString()}</Metric>
          <Text>Nombre total de clients</Text>
        </Card>
        <Card>
          <Title>Connexions Totales</Title>
          <Metric>{operator.nb_connexions_total.toLocaleString()}</Metric>
          <Text>Nombre total de connexions</Text>
        </Card>
        <Card>
          <Title>Pays Actifs</Title>
          <Metric>{operator.nb_pays_total}</Metric>
          <Text>Nombre de pays desservis</Text>
        </Card>
        <Card>
          <Title>Statut</Title>
          <Metric>{operator.statut_activite}</Metric>
          <Text>État actuel de l'opérateur</Text>
        </Card>
      </div>

      {/* Évolution des connexions */}
      <Card>
        <Title>Évolution des Connexions</Title>
        <Text className="text-sm text-gray-500 mb-4">
          Historique des connexions sur les 30 derniers jours
        </Text>
        <AreaChart
          className="h-72 mt-4"
          data={operator.connexions_par_jour}
          index="date"
          categories={["nb_connexions"]}
          colors={["blue"]}
          valueFormatter={(number: number) => number.toLocaleString()}
          showLegend={true}
          showGridLines={true}
        />
      </Card>

      {/* Analyse des pauses */}
      <Card>
        <Title>Analyse des Pauses d'Activité</Title>
        <Text className="text-sm text-gray-500 mb-4">
          Visualisation des périodes d&apos;inactivité. Rouge = pause longue (&gt;7 jours), Jaune = pause moyenne (3-7 jours), Vert = pause courte (&lt;3 jours).
        </Text>
        <div className="space-y-4 mt-4">
          <Tracker
            data={getGapTrackerData()}
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
      </Card>

      {/* Distribution par pays */}
      <Card>
        <Title>Distribution des Connexions par Pays</Title>
        <Text className="text-sm text-gray-500 mb-4">
          Répartition géographique des connexions
        </Text>
        <BarChart
          className="h-72 mt-4"
          data={operator.connexions_par_pays}
          index="pays"
          categories={["nb_connexions"]}
          colors={["blue"]}
          valueFormatter={(number: number) => number.toLocaleString()}
          showLegend={false}
          showGridLines={true}
        />
      </Card>
    </div>
  )
} 