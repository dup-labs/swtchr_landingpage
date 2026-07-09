import React from 'react'
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { C } from './ui.jsx'

export { arrayMove }
export const uid = () => Math.random().toString(36).slice(2, 9)

// Lista ordenável. `ids` = ids estáveis na ordem atual; `onReorder(from,to)` reordena o estado.
export function SortableList({ ids, onReorder, children }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // 5px pra não confundir clique com drag
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const onDragEnd = ({ active, over }) => {
    if (over && active.id !== over.id) {
      const from = ids.indexOf(active.id)
      const to = ids.indexOf(over.id)
      if (from !== -1 && to !== -1) onReorder(from, to)
    }
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  )
}

// Item ordenável (render-prop): passa `dragProps` pro filho colocar no handle (ex.: o ⠿).
export function SortableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 20 : 'auto',
    position: 'relative',
  }
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  )
}

// O "punho" de arrastar (recebe os dragProps do SortableItem)
export function DragHandle(props) {
  return (
    <span
      {...props}
      title="arrastar para reordenar"
      style={{ cursor: 'grab', color: C.muted, fontSize: 15, lineHeight: 1, padding: '2px 4px', touchAction: 'none', userSelect: 'none' }}
    >
      ⠿
    </span>
  )
}
