/*
 * Copyright (C) 2022 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import React, {useEffect, useState, useRef} from 'react'
import $ from 'jquery'
import '@canvas/jquery/jquery.simulate'
import '@canvas/rails-flash-notifications'
import {useScope as createI18nScope} from '@canvas/i18n'
import {Table} from '@instructure/ui-table'
import type {
  PaceContext,
  APIPaceContextTypes,
  ResponsiveSizes,
  OrderType,
  SortableColumn,
  PaceContextProgress,
} from '../types'
import {Button, IconButton} from '@instructure/ui-buttons'
import {Flex} from '@instructure/ui-flex'
import {Text} from '@instructure/ui-text'
import {View} from '@instructure/ui-view'
import {Link} from '@instructure/ui-link'
import {TruncateText} from '@instructure/ui-truncate-text'
import {Spinner} from '@instructure/ui-spinner'
import Paginator from '@canvas/instui-bindings/react/Paginator'
import {formatTimeAgoDate} from '../utils/date_stuff/date_helpers'
import {paceContextsActions} from '../actions/pace_contexts'
import {generateModalLauncherId} from '../utils/utils'
import {Checkbox} from '@instructure/ui-checkbox'
import {Menu} from '@instructure/ui-menu'
import {IconDownloadLine, IconMoreLine, IconCheckLine, IconWarningLine} from '@instructure/ui-icons'

import type {SpinnerProps} from '@instructure/ui-spinner'
import type {ViewProps} from '@instructure/ui-view'
import type {TableColHeaderProps} from '@instructure/ui-table'
import NoResults from './no_results'

type SortingProps = {
  onRequestSort: () => void
  sortDirection: TableColHeaderProps['sortDirection']
  'data-button-label': string
}

const I18n = createI18nScope('course_paces_app')

export interface PaceContextsTableProps {
  paceContexts: PaceContext[]
  contextType: APIPaceContextTypes
  pageCount: number
  currentPage: number
  currentSortBy: SortableColumn | null
  currentOrderType: OrderType
  isLoading: boolean
  responsiveSize: ResponsiveSizes
  setPage: (page: number) => void
  setOrderType: typeof paceContextsActions.setOrderType
  handleContextSelect: (paceContext: PaceContext) => void
  contextsPublishing: PaceContextProgress[]
}

interface Header {
  key: string
  label: string
  content: string | React.ReactElement
  width: string
  sortable?: boolean
}

const PACE_TYPES: {[index: string]: string} = {
  StudentEnrollment: I18n.t('Individual'),
  CourseSection: I18n.t('Section'),
  Course: I18n.t('Default'),
}

type SortType = {
  [k in OrderType]: 'ascending' | 'descending'
}

const SORT_TYPE: SortType = {
  asc: 'ascending',
  desc: 'descending',
}

const {screenReaderFlashMessage} = $ as any

const PaceContextsTable = ({
  currentPage,
  currentSortBy,
  currentOrderType,
  paceContexts = [],
  contextType,
  pageCount,
  setPage,
  setOrderType,
  handleContextSelect,
  isLoading,
  responsiveSize,
  contextsPublishing,
}: PaceContextsTableProps) => {
  const [headers, setHeaders] = useState<Header[]>([])
  const [newOrderType, setNewOrderType] = useState(currentOrderType)
  const [selectedPacesIds, setSelectedPacesIds] = useState(new Set())

  const handleSelectAllPacesIds = (allSelected: boolean) => {
    setSelectedPacesIds(allSelected ? new Set() : new Set(paceContexts.map(({item_id}) => item_id)))
  }

  const handleSelectPaceId = (rowSelected: boolean, rowId: string) => {
    const copy = new Set(selectedPacesIds)
    if (rowSelected) {
      copy.delete(rowId)
    } else {
      copy.add(rowId)
    }
    setSelectedPacesIds(copy)
  }

  const allPacesSelected =
    selectedPacesIds.size > 0 && paceContexts.every(({item_id}) => selectedPacesIds.has(item_id))
  const somePacesSelected = selectedPacesIds.size > 0 && !allPacesSelected

  const tableRef = useRef<HTMLElement | null>(null)
  const paceType = contextType === 'student_enrollment' ? 'student' : 'section'
  const tableCaption = I18n.t('%{paceType} paces: sorted by %{sortBy} in %{orderType} order', {
    paceType,
    sortBy: currentSortBy,
    orderType: SORT_TYPE[currentOrderType],
  })

  useEffect(() => {
    setHeaders(getHeaderByContextType())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextType])

  useEffect(() => {
    setNewOrderType(currentOrderType === 'asc' ? 'desc' : 'asc')
  }, [currentOrderType])

  useEffect(() => {
    tableRef.current?.querySelectorAll<HTMLElement>('th[data-button-label]').forEach(el => {
      const buttonHeaderLabel = el.getAttribute('data-button-label')
      const sortingButton = el.querySelector('button')
      // InstUI uses the default announcement for the aria-sort attribute,
      // but that does not provide any description for the sorting button
      // this overrides the column header aria-sort and sets a custom announcement
      // for the sorting button
      el.removeAttribute('aria-sort')
      sortingButton?.setAttribute('aria-label', buttonHeaderLabel ?? '???')
    })
  }, [newOrderType])

  const formatDate = (date: string) => {
    if (!date) return '--'

    return formatTimeAgoDate(date)
  }

  const getHeaderByContextType = () => {
    let headerCols: Header[] = []
    switch (contextType) {
      case 'section':
        headerCols = [
          {
            key: 'name',
            label: I18n.t('Section'),
            content: I18n.t('Section'),
            width: '35%',
            sortable: true,
          },
          {
            key: 'size',
            label: I18n.t('Section Size'),
            content: I18n.t('Section Size'),
            width: '25%',
          },
          {key: 'paceType', label: I18n.t('Pace Type'), content: I18n.t('Pace Type'), width: '20%'},
          {
            key: 'modified',
            label: I18n.t('Last Modified'),
            content: I18n.t('Last Modified'),
            width: '20%',
          },
        ]
        break
      case 'student_enrollment':
        headerCols = [
          {
            key: 'name',
            label: I18n.t('Student'),
            content: I18n.t('Student'),
            width: '30%',
            sortable: true,
          },
          ...(
            window.ENV.FEATURES.course_pace_pacing_status_labels
              ? [{
                  key: 'paceStatus',
                  label: I18n.t('Pace Status'),
                  content: I18n.t('Pace Status'),
                  width: '20%'
                }]
              : []
          ),
          {
            key: 'pace',
            label: I18n.t('Assigned Pace'),
            content: I18n.t('Assigned Pace'),
            width: '20%',
          },
          {key: 'paceType', label: I18n.t('Pace Type'), content: I18n.t('Pace Type'), width: '15%'},
          {
            key: 'modified',
            label: I18n.t('Last Modified'),
            content: I18n.t('Last Modified'),
            width: '15%',
          },
        ]
        break
      default:
        headerCols = []
    }
    return headerCols
  }

  const renderContextLink = (paceContext: PaceContext) => (
    <Link
      id={generateModalLauncherId(paceContext)}
      isWithinText={false}
      onClick={() => handleContextSelect(paceContext)}
      margin="xxx-small none"
    >
      <TruncateText>{paceContext.name}</TruncateText>
    </Link>
  )

  const renderLastModified = (type: string, contextId?: string, lastModified: string = '') => {
    const publishingContextCodes = contextsPublishing.map(
      ({pace_context}) => `${pace_context.type}${pace_context.item_id}`,
    )
    const contextCode = `${type}${contextId}`
    if (contextId && publishingContextCodes.includes(contextCode)) {
      return loadingView(
        `publishing-pace-${contextId}-indicator`,
        I18n.t('Publishing pace...'),
        'x-small',
        'start',
      )
    }

    return formatDate(lastModified)
  }

  const getValuesByContextType = (paceContext: PaceContext) => {
    let values: any[] = []
    const appliedPace = paceContext?.applied_pace
    const appliedPaceType = paceContext?.applied_pace?.type || ''
    switch (contextType) {
      case 'section': {
        const studentCountText = I18n.t(
          {
            one: '1 Student',
            other: '%{count} Students',
          },
          {count: paceContext.associated_student_count},
        )
        values = [
          renderContextLink(paceContext),
          studentCountText.toString(),
          PACE_TYPES[appliedPaceType] || appliedPaceType,
          renderLastModified(paceContext.type, paceContext?.item_id, appliedPace?.last_modified),
        ]
        break
      }
      case 'student_enrollment': {
        const studentOnPace = paceContext.on_pace ?
          <Text color="success"><IconCheckLine size="x-small" /> {I18n.t("On Pace")}</Text> :
          <Text color="danger"><IconWarningLine size="x-small" /> {I18n.t("Off Pace")}</Text>
        values = [
          renderContextLink(paceContext),
          ...(
            window.ENV.FEATURES.course_pace_pacing_status_labels
              ? [studentOnPace]
              : []
          ),
          appliedPace?.name,
          PACE_TYPES[appliedPaceType] || appliedPaceType,
          renderLastModified(paceContext.type, paceContext?.item_id, appliedPace?.last_modified),
        ]
        break
      }
      default:
        values = []
    }
    return values
  }

  const handleSort = () => {
    const message = I18n.t('Sorted by %{sortBy} in %{orderType} order', {
      sortBy: currentSortBy,
      orderType: SORT_TYPE[newOrderType],
    })
    setOrderType(newOrderType)
    screenReaderFlashMessage(message)
  }

  const renderHeader = () => {
    const sortingProps: SortingProps = {
      onRequestSort: handleSort,
      sortDirection: currentSortBy ? SORT_TYPE[currentOrderType] : 'none',
      'data-button-label': I18n.t('Sort %{orderType} by %{sortBy}', {
        sortBy: currentSortBy,
        orderType: SORT_TYPE[newOrderType],
      }),
    }

    const tableHeaders = window.ENV.FEATURES.course_pace_download_document
      ? [
          {
            key: 'select',
            label: 'Select all paces',
            content: selectAllPacesCheckbox,
            width: '3.8rem',
            sortable: false,
          },
          ...headers,
          {key: 'moreMenu', label: 'More options', content: '', width: '3.8rem', sortable: false},
        ]
      : headers

    return (
      <Table.Head renderSortLabel={I18n.t('Sort By')}>
        <Table.Row key="header-table">
          {tableHeaders.map(header => (
            <Table.ColHeader
              id={`header-table-${header.key}`}
              key={`contexts-header-table-${header.key}`}
              width={header.width}
              themeOverride={{padding: '0.75rem'}}
              {...(header.sortable && {
                ...sortingProps,
                'aria-label': header.label,
                'data-testid': `sortable-column-${header.key}`,
              })}
            >
              <View display="inline-block">
                {typeof header.content === 'string' ? (
                  <Text weight="bold">{header.content}</Text>
                ) : (
                  header.content
                )}
              </View>
            </Table.ColHeader>
          ))}
        </Table.Row>
      </Table.Head>
    )
  }

  const selectPaceRowOption = (row_item_id: string) => {
    const rowSelected = selectedPacesIds.has(row_item_id)
    return (
      <Checkbox
        label=""
        key={`select-pace-row-${row_item_id}`}
        onChange={() => handleSelectPaceId(rowSelected, row_item_id)}
        checked={rowSelected}
      />
    )
  }

  const downloadPaceDocxOption = (
    <Menu.Item data-testid="download-pace">
      <IconDownloadLine /> Download
    </Menu.Item>
  )

  const renderRow = (paceContext: PaceContext) => {
    const cells = getValuesByContextType(paceContext).map((cell, index) => (
      <Table.Cell
        data-testid="course-pace-item"
        key={`contexts-table-cell-${index}`}
        themeOverride={{padding: '0.7rem'}}
      >
        {cell}
      </Table.Cell>
    ))

    const rowCells = window.ENV.FEATURES.course_pace_download_document
      ? [
          <Table.Cell key="select-pace-row" themeOverride={{padding: '0.7rem'}}>
            {selectPaceRowOption(paceContext.item_id)}
          </Table.Cell>,
          ...cells,
          <Table.Cell key="more-menu" themeOverride={{padding: '0.7rem'}}>
            <Menu
              themeOverride={{minWidth: '16.25rem', maxWidth: '16.25rem'}}
              trigger={
                <IconButton
                  withBackground={false}
                  withBorder={false}
                  renderIcon={IconMoreLine}
                  data-testid="show-more-options"
                  screenReaderLabel="Show more options"
                />
              }
              offsetX={100}
              withArrow={false}
            >
              {downloadPaceDocxOption}
            </Menu>
          </Table.Cell>,
        ]
      : cells

    return (
      <Table.Row data-testid="course-pace-row" key={paceContext.item_id}>
        {rowCells}
      </Table.Row>
    )
  }

  const renderMobileRow = (paceContext: PaceContext) => {
    const values = getValuesByContextType(paceContext)
    const downloadDocxRowItemWidth = `${window.innerWidth - 60}px`

    return (
      <View
        key={`context-row-${paceContext.item_id}`}
        as="div"
        background="secondary"
        padding="xx-small small"
        margin="small 0"
      >
        {window.ENV.FEATURES.course_pace_download_document && (
          <Flex key="mobile-context-row-checkbox" as="div" width="3,8rem" margin="medium 0">
            {selectPaceRowOption(paceContext.item_id)}
          </Flex>
        )}
        {headers.map(({content: title}, index) => (
          <Flex key={`mobile-context-row-${index}`} as="div" width="100%" margin="medium 0">
            <Flex.Item size="50%">
              <Text weight="bold">{title}</Text>
            </Flex.Item>
            <Flex.Item size="50%">{values[index]}</Flex.Item>
          </Flex>
        ))}
        {window.ENV.FEATURES.course_pace_download_document && (
          <Flex key="mobile-context-row-more-menu" as="div" width="100%" margin="medium 0">
            <Flex.Item as="div" width="100%" margin="none" padding="none">
              <Menu
                themeOverride={{
                  minWidth: downloadDocxRowItemWidth,
                  maxWidth: downloadDocxRowItemWidth,
                }}
                trigger={
                  <Button display="block" width="100%" data-testid="show-more-options">
                    More
                  </Button>
                }
                withArrow={false}
                placement="bottom start"
              >
                {downloadPaceDocxOption}
              </Menu>
            </Flex.Item>
          </Flex>
        )}
      </View>
    )
  }

  const selectAllPacesCheckbox = (
    <Checkbox
      label=""
      data-testid="select-all-paces-checkbox"
      onChange={() => handleSelectAllPacesIds(allPacesSelected)}
      checked={allPacesSelected}
      indeterminate={somePacesSelected}
    />
  )
  const loadingView = (
    dataTestId: string,
    title: string,
    size: SpinnerProps['size'] = 'large',
    align: ViewProps['textAlign'] = 'center',
  ) => (
    <View data-testid={dataTestId} as="div" textAlign={align}>
      <Spinner size={size} renderTitle={title} margin="none" />
    </View>
  )

  const downloadDocxRow = () => {
    const interactionValue = selectedPacesIds.size > 0 ? 'enabled' : 'disabled'

    return window.ENV.FEATURES.course_pace_download_document ? (
      <View as="div" padding="small" background="transparent" display="block">
        <Flex justifyItems="space-between" margin="0 0 small">
          <Flex>
            <Flex.Item>{responsiveSize === 'small' && <>{selectAllPacesCheckbox}</>}</Flex.Item>
          </Flex>

          <Flex justifyItems="end" direction="row" gap="small">
            <Flex.Item width="4.5rem">
              <Text> {`${selectedPacesIds.size} selected`}</Text>
            </Flex.Item>

            <Flex.Item width="2.375rem">
              <IconButton
                data-testid="download-selected-button"
                screenReaderLabel="Download selected paces"
                renderIcon={IconDownloadLine}
                interaction={interactionValue}
              />
            </Flex.Item>
          </Flex>
        </Flex>
      </View>
    ) : null
  }

  if (!isLoading && paceContexts.length === 0) {
    return (
      <View as="div" borderWidth="0 small small small">
        <NoResults />
      </View>
    )
  }

  return (
    <>
      {responsiveSize === 'small' ? (
        !isLoading && (
          <View data-testid="pace-contexts-mobile-view">
            {downloadDocxRow()}
            {paceContexts.map((paceContext: PaceContext) => renderMobileRow(paceContext))}
          </View>
        )
      ) : (
        <View as="div" margin="none none large none" borderWidth="0 small">
          {downloadDocxRow()}
          <Table
            elementRef={e => {
              tableRef.current = e as HTMLElement
            }}
            data-testid="course-pace-context-table"
            caption={tableCaption}
          >
            {renderHeader()}
            {!isLoading && (
              <Table.Body>
                {paceContexts.map((paceContext: PaceContext) => renderRow(paceContext))}
              </Table.Body>
            )}
          </Table>
        </View>
      )}
      {isLoading
        ? loadingView('container-loading-view', I18n.t('Waiting for results to load'), 'large')
        : pageCount > 1 && (
            <Paginator
              data-testid="context-table-paginator"
              loadPage={setPage}
              page={currentPage}
              pageCount={pageCount}
            />
          )}
    </>
  )
}

export default PaceContextsTable
