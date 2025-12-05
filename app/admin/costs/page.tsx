'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { createClient } from '@supabase/supabase-js'
import { ArrowDown, DollarSign, TrendingUp, Zap } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface CostEvent {
  created_at: string
  cost_usd: number
  input_tokens: number
  output_tokens: number
  cached_tokens: number
  model: string
  operation: string
}

interface DailyCost {
  date: string
  cost: number
  tokens: number
}

interface OperationBreakdown {
  operation: string
  cost: number
  count: number
}

interface ModelBreakdown {
  model: string
  cost: number
  count: number
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function CostsPage() {
  const [loading, setLoading] = useState(true)
  const [dailyData, setDailyData] = useState<DailyCost[]>([])
  const [operationData, setOperationData] = useState<OperationBreakdown[]>([])
  const [modelData, setModelData] = useState<ModelBreakdown[]>([])
  const [totalCost, setTotalCost] = useState(0)
  const [totalTokens, setTotalTokens] = useState(0)
  const [costSavings, setCostSavings] = useState(0)

  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    fetchCostData()
  }, [dateRange])

  async function fetchCostData() {
    setLoading(true)
    try {
      // Calculate start date
      const daysBack = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysBack)

      // Fetch all cost events
      const { data: events, error } = await supabase
        .from('cost_tracking')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })

      if (error) throw error

      // Process daily data
      const dailyMap = new Map<string, { cost: number; tokens: number }>()
      const operationMap = new Map<string, { cost: number; count: number }>()
      const modelMap = new Map<string, { cost: number; count: number }>()

      let total = 0
      let totalTokensCount = 0
      let flashLiteCost = 0
      let regularFlashCost = 0

      for (const event of events as CostEvent[]) {
        const date = new Date(event.created_at).toISOString().split('T')[0]

        // Daily accumulation
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { cost: 0, tokens: 0 })
        }
        const day = dailyMap.get(date)!
        day.cost += event.cost_usd
        day.tokens += event.input_tokens + event.output_tokens

        // Operation breakdown
        if (!operationMap.has(event.operation)) {
          operationMap.set(event.operation, { cost: 0, count: 0 })
        }
        const op = operationMap.get(event.operation)!
        op.cost += event.cost_usd
        op.count += 1

        // Model breakdown
        if (!modelMap.has(event.model)) {
          modelMap.set(event.model, { cost: 0, count: 0 })
        }
        const model = modelMap.get(event.model)!
        model.cost += event.cost_usd
        model.count += 1

        // Totals
        total += event.cost_usd
        totalTokensCount += event.input_tokens + event.output_tokens

        // Calculate savings (compare flash-lite vs flash pricing)
        if (event.model.includes('flash-lite')) {
          flashLiteCost += event.cost_usd
          // Estimate what it would have cost with regular flash
          const inputTokens = event.input_tokens
          const outputTokens = event.output_tokens
          regularFlashCost += (inputTokens / 1_000_000) * 0.15 + (outputTokens / 1_000_000) * 0.60
        }
      }

      setDailyData(
        Array.from(dailyMap.entries())
          .map(([date, data]) => ({
            date: new Date(date).toLocaleDateString('it-IT', { month: 'short', day: 'numeric' }),
            cost: parseFloat(data.cost.toFixed(4)),
            tokens: data.tokens,
          }))
      )

      setOperationData(
        Array.from(operationMap.entries())
          .map(([operation, data]) => ({
            operation,
            cost: parseFloat(data.cost.toFixed(4)),
            count: data.count,
          }))
          .sort((a, b) => b.cost - a.cost)
      )

      setModelData(
        Array.from(modelMap.entries())
          .map(([model, data]) => ({
            model,
            cost: parseFloat(data.cost.toFixed(4)),
            count: data.count,
          }))
          .sort((a, b) => b.cost - a.cost)
      )

      setTotalCost(parseFloat(total.toFixed(4)))
      setTotalTokens(totalTokensCount)
      setCostSavings(parseFloat((regularFlashCost - flashLiteCost).toFixed(4)))
    } catch (error) {
      console.error('Failed to fetch cost data:', error)
    } finally {
      setLoading(false)
    }
  }

  const averageCostPerDay = dailyData.length > 0 ? (totalCost / dailyData.length).toFixed(4) : '0'
  const projectedMonthlyCost = (parseFloat(averageCostPerDay) * 30).toFixed(2)

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Cost Analytics Dashboard</h1>
        <p className="text-muted-foreground">Monitor AI usage and track optimization savings</p>
      </div>

      {/* Date Range Selector */}
      <div className="flex gap-2">
        <Button
          variant={dateRange === '7d' ? 'default' : 'outline'}
          onClick={() => setDateRange('7d')}
        >
          7 Days
        </Button>
        <Button
          variant={dateRange === '30d' ? 'default' : 'outline'}
          onClick={() => setDateRange('30d')}
        >
          30 Days
        </Button>
        <Button
          variant={dateRange === '90d' ? 'default' : 'outline'}
          onClick={() => setDateRange('90d')}
        >
          90 Days
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Last {dateRange === '7d' ? '7' : dateRange === '30d' ? '30' : '90'} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Daily Cost</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${averageCostPerDay}</div>
            <p className="text-xs text-muted-foreground">Projected: ${projectedMonthlyCost}/month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalTokens / 1_000_000).toFixed(2)}M</div>
            <p className="text-xs text-muted-foreground">{totalTokens.toLocaleString()} tokens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Savings</CardTitle>
            <ArrowDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${costSavings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From flash-lite optimization</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Daily Trend</TabsTrigger>
          <TabsTrigger value="operations">By Operation</TabsTrigger>
          <TabsTrigger value="models">By Model</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>Daily Cost Trend</CardTitle>
              <CardDescription>Cost and token usage over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="cost"
                    stroke="#3b82f6"
                    name="Cost ($)"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="tokens"
                    stroke="#10b981"
                    name="Tokens"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost by Operation</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={operationData}
                      dataKey="cost"
                      nameKey="operation"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {operationData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Operation Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {operationData.map((op) => (
                    <div key={op.operation} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium capitalize">{op.operation}</p>
                        <p className="text-sm text-muted-foreground">{op.count} operations</p>
                      </div>
                      <p className="font-semibold">${op.cost.toFixed(4)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle>Cost by Model</CardTitle>
              <CardDescription>Distribution of costs across different AI models</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={modelData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="model" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cost" fill="#3b82f6" name="Cost ($)" />
                  <Bar dataKey="count" fill="#10b981" name="Operations" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
          <CardDescription>Latest cost tracking events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Time</th>
                  <th className="text-left py-2">Operation</th>
                  <th className="text-left py-2">Model</th>
                  <th className="text-right py-2">Input</th>
                  <th className="text-right py-2">Output</th>
                  <th className="text-right py-2">Cost</th>
                </tr>
              </thead>
              <tbody>
                {dailyData.map((day, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2">{day.date}</td>
                    <td>-</td>
                    <td>-</td>
                    <td className="text-right">-</td>
                    <td className="text-right">-</td>
                    <td className="text-right font-medium">${day.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Loading cost data...</p>
        </div>
      )}
    </div>
  )
}
