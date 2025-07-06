import React from 'react'
import CalendarHeatmap from 'react-calendar-heatmap'
import 'react-calendar-heatmap/dist/styles.css'

interface HeatmapData {
  date: string
  count: number
}

interface ProfessionalHeatmapProps {
  data: HeatmapData[]
  title: string
  startDate: Date
  endDate: Date
  colorScheme?: 'blue' | 'green' | 'purple' | 'red'
}

export const ProfessionalHeatmap: React.FC<ProfessionalHeatmapProps> = ({
  data,
  title,
  startDate,
  endDate,
  colorScheme = 'blue'
}) => {
  const getColorClass = (value: number | null) => {
    if (!value) return 'fill-gray-100 dark:fill-gray-800'
    
    const intensity = Math.min(Math.floor((value / getMaxValue()) * 4), 4)
    
    const colorMaps = {
      blue: [
        'fill-blue-100 dark:fill-blue-900/20',
        'fill-blue-200 dark:fill-blue-800/40', 
        'fill-blue-400 dark:fill-blue-600/60',
        'fill-blue-600 dark:fill-blue-500/80',
        'fill-blue-800 dark:fill-blue-400'
      ],
      green: [
        'fill-green-100 dark:fill-green-900/20',
        'fill-green-200 dark:fill-green-800/40',
        'fill-green-400 dark:fill-green-600/60', 
        'fill-green-600 dark:fill-green-500/80',
        'fill-green-800 dark:fill-green-400'
      ],
      purple: [
        'fill-purple-100 dark:fill-purple-900/20',
        'fill-purple-200 dark:fill-purple-800/40',
        'fill-purple-400 dark:fill-purple-600/60',
        'fill-purple-600 dark:fill-purple-500/80', 
        'fill-purple-800 dark:fill-purple-400'
      ],
      red: [
        'fill-red-100 dark:fill-red-900/20',
        'fill-red-200 dark:fill-red-800/40',
        'fill-red-400 dark:fill-red-600/60',
        'fill-red-600 dark:fill-red-500/80',
        'fill-red-800 dark:fill-red-400'
      ]
    }
    
    return colorMaps[colorScheme][intensity]
  }

  const getMaxValue = () => {
    return Math.max(...data.map(item => item.count), 1)
  }

  const tooltipDataAttrs = (value: any) => {
    if (!value || !value.date) return {}
    
    const count = value.count || 0
    const date = new Date(value.date).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
    
    return {
      'data-tooltip': `${count} ${title.toLowerCase()} on ${date}`
    }
  }

  const transformedData = data.map(item => ({
    date: item.date,
    count: item.count
  }))

  return (
    <div className="w-full">
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{title}</h4>
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Less</span>
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map(level => (
              <div
                key={level}
                className={`w-3 h-3 rounded-sm ${level === 0 ? 'fill-gray-100 dark:fill-gray-800' : getColorClass(level * (getMaxValue() / 4))}`}
                style={{
                  backgroundColor: level === 0 ? undefined : 
                    colorScheme === 'blue' ? `rgb(59 130 246 / ${0.2 + level * 0.2})` :
                    colorScheme === 'green' ? `rgb(34 197 94 / ${0.2 + level * 0.2})` :
                    colorScheme === 'purple' ? `rgb(147 51 234 / ${0.2 + level * 0.2})` :
                    `rgb(239 68 68 / ${0.2 + level * 0.2})`
                }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
      
      <div className="heatmap-container">
        <style jsx global>{`
          .react-calendar-heatmap {
            font-family: inherit;
          }
          
          .react-calendar-heatmap .react-calendar-heatmap-small-text {
            font-size: 10px;
            fill: rgb(107 114 128);
          }
          
          .react-calendar-heatmap rect:hover {
            stroke: rgb(59 130 246);
            stroke-width: 1px;
          }
          
          .react-calendar-heatmap .react-calendar-heatmap-month-label {
            font-size: 12px;
            fill: rgb(107 114 128);
          }
          
          .react-calendar-heatmap .react-calendar-heatmap-weekday-label {
            font-size: 10px;
            fill: rgb(107 114 128);
          }
          
          @media (prefers-color-scheme: dark) {
            .react-calendar-heatmap .react-calendar-heatmap-small-text,
            .react-calendar-heatmap .react-calendar-heatmap-month-label,
            .react-calendar-heatmap .react-calendar-heatmap-weekday-label {
              fill: rgb(156 163 175);
            }
          }
        `}</style>
        
        <CalendarHeatmap
          startDate={startDate}
          endDate={endDate}
          values={transformedData}
          classForValue={value => getColorClass(value?.count || 0)}
          showWeekdayLabels={true}
          gutterSize={2}
        />
      </div>
    </div>
  )
}
