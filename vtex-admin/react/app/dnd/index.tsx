/**
 * Drag-and-drop (porte de nuvemshop/panel/src/dnd.jsx) — dnd-kit core 6 / sortable 10.
 *
 *   <SortableList ids={items.map(i => i.uid)} onReorder={(from, to) => setItems(arrayMove(items, from, to))}>
 *     {items.map(item => (
 *       <SortableItem key={item.uid} id={item.uid}>
 *         {({ dragHandleProps }) => <div><DragHandle {...dragHandleProps} /> {item.title}</div>}
 *       </SortableItem>
 *     ))}
 *   </SortableList>
 */
import React from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, UniqueIdentifier } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove as dndArrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

/** Move o item de `from` para `to` (retorna novo array). */
export function arrayMove<T>(array: T[], from: number, to: number): T[] {
  return dndArrayMove(array, from, to)
}

/** id curto aleatório (seções/itens novos criados no front). */
export const uid = (): string => Math.random().toString(36).slice(2, 9)

/** Props para espalhar no "punho" de arrastar. */
export type DragHandleProps = React.HTMLAttributes<HTMLElement>

export interface SortableListProps {
  /** ids estáveis na ordem atual */
  ids: UniqueIdentifier[]
  /** reordena o estado: (índice de origem, índice de destino) */
  onReorder: (from: number, to: number) => void
  children: React.ReactNode
}

/** Lista ordenável vertical. */
export function SortableList({ ids, onReorder, children }: SortableListProps) {
  const sensors = useSensors(
    // 5px pra não confundir clique com drag
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
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

export interface SortableItemRenderArgs {
  dragHandleProps: DragHandleProps
  isDragging: boolean
}

export interface SortableItemProps {
  id: UniqueIdentifier
  disabled?: boolean
  children: (args: SortableItemRenderArgs) => React.ReactNode
}

/** Item ordenável (render-prop): entrega `dragHandleProps` pro filho colocar no handle. */
export function SortableItem({ id, disabled, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 20 : 'auto',
    position: 'relative',
  }

  const dragHandleProps = ({ ...attributes, ...(listeners || {}) } as unknown) as DragHandleProps

  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandleProps, isDragging })}
    </div>
  )
}

export interface DragHandleComponentProps extends DragHandleProps {
  disabled?: boolean
}

/** O "punho" ⠿ de arrastar (recebe os dragHandleProps do SortableItem). */
export function DragHandle({ disabled, className, ...props }: DragHandleComponentProps) {
  return (
    <span
      {...props}
      title={disabled ? undefined : 'arrastar para reordenar'}
      className={'sw-handle' + (disabled ? ' sw-handle--disabled' : '') + (className ? ' ' + className : '')}
    >
      ⠿
    </span>
  )
}
