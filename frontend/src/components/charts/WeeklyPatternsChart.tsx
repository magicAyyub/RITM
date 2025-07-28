import React from 'react'
import { AreaChart } from "@/components/ui/AreaChart"
import { Card } from "@/components/Card"
import { Tabs, TabsList, TabsTrigger } from "@/components/Tabs"
import { Title } from "@/components/ui/Title"
import { Text } from "@/components/ui/Text"
import { ExportButton } from "@/components/ui/ExportButton"
import { downloadCSV } from "@/lib/exportUtils"
import { useWeeklyPatterns } from '@/hooks/useWeeklyPatterns'

interface WeeklyPatternsChartProps {
  showInAppOnly: boolean
  onModeChange: (inAppOnly: boolean) => void
}

export function WeeklyPatternsChart({ showInAppOnly, onModeChange }: WeeklyPatternsChartProps) {
  const { loading, getFormattedData, getExportData } = useWeeklyPatterns()

  const renderChartLoader = () => (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  )

  if (loading) {
    return (
      <Card>
        {renderChartLoader()}
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <Title>Patterns d&apos;Activité Hebdomadaire</Title>
          <Tabs 
            value={showInAppOnly ? "in-app" : "all"} 
            onValueChange={(value) => onModeChange(value === "in-app")}
          >
            <TabsList>
              <TabsTrigger value="all">Toutes les connexions</TabsTrigger>
              <TabsTrigger value="in-app">IN App uniquement</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <ExportButton 
          onClick={() => downloadCSV(
            getExportData(showInAppOnly),
            `activite-hebdomadaire${showInAppOnly ? '-in-app' : ''}`
          )} 
        />
      </div>
      <Text className="text-sm text-gray-500 mb-4">
        Détail de l&apos;activité par jour, avec connexions, clients uniques et IPs uniques. (Sur 8 semaines)
        {showInAppOnly && " - Filtré pour les connexions IN App uniquement"}
      </Text>
      <AreaChart
        className="mt-6 h-80"
        data={getFormattedData(showInAppOnly)}
        index="jour_formate"
        categories={showInAppOnly ? ['nb_connexions'] : ['nb_connexions', 'nb_clients_uniques', 'nb_ips_uniques']}
        colors={showInAppOnly ? ['blue'] : ['blue', 'emerald', 'violet']}
        showLegend={!showInAppOnly}
        showYAxis
        showXAxis
        valueFormatter={(number: number) => number.toLocaleString()}
        yAxisWidth={50}
      />
    </Card>
  )
}
