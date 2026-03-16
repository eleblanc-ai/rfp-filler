import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DrivePicker } from './drive-picker'
import type { DriveFile } from './use-drive-files'

const mockFetchFiles = vi.hoisted(() => vi.fn())
const mockUseDriveFiles = vi.hoisted(() => vi.fn())

vi.mock('./use-drive-files', () => ({
  useDriveFiles: mockUseDriveFiles,
}))

const testFiles: DriveFile[] = [
  { id: '1', name: 'RFP Template 2026.docx', modifiedTime: '2026-03-10T12:00:00Z' },
  { id: '2', name: 'Proposal Draft.docx', modifiedTime: '2026-03-08T09:30:00Z' },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockFetchFiles.mockResolvedValue(undefined)
  mockUseDriveFiles.mockReturnValue({
    files: [],
    loading: false,
    error: null,
    fetchFiles: mockFetchFiles,
  })
})

describe('DrivePicker', () => {
  test('shows reconnect message when no provider token', () => {
    render(
      <DrivePicker
        providerToken={null}
        onSelect={vi.fn()}
        onReconnect={vi.fn()}
      />,
    )
    expect(screen.getByText('Google Drive access has expired.')).toBeInTheDocument()
    expect(screen.getByText('Reconnect Google Drive')).toBeInTheDocument()
  })

  test('calls onReconnect when reconnect button is clicked', async () => {
    const onReconnect = vi.fn()
    render(
      <DrivePicker
        providerToken={null}
        onSelect={vi.fn()}
        onReconnect={onReconnect}
      />,
    )
    await userEvent.click(screen.getByText('Reconnect Google Drive'))
    expect(onReconnect).toHaveBeenCalled()
  })

  test('shows select button when closed', () => {
    render(
      <DrivePicker
        providerToken="token"
        onSelect={vi.fn()}
        onReconnect={vi.fn()}
      />,
    )
    expect(screen.getByText('Select RFP Template from Drive')).toBeInTheDocument()
  })

  test('fetches and shows files when opened', async () => {
    mockUseDriveFiles.mockReturnValue({
      files: testFiles,
      loading: false,
      error: null,
      fetchFiles: mockFetchFiles,
    })

    render(
      <DrivePicker
        providerToken="token"
        onSelect={vi.fn()}
        onReconnect={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByText('Select RFP Template from Drive'))

    expect(mockFetchFiles).toHaveBeenCalled()
    expect(screen.getByText('RFP Template 2026.docx')).toBeInTheDocument()
    expect(screen.getByText('Proposal Draft.docx')).toBeInTheDocument()
  })

  test('shows empty state when no files', async () => {
    render(
      <DrivePicker
        providerToken="token"
        onSelect={vi.fn()}
        onReconnect={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByText('Select RFP Template from Drive'))
    expect(screen.getByText('No Google Docs found in your Drive.')).toBeInTheDocument()
  })

  test('shows loading state', async () => {
    mockUseDriveFiles.mockReturnValue({
      files: [],
      loading: true,
      error: null,
      fetchFiles: mockFetchFiles,
    })

    render(
      <DrivePicker
        providerToken="token"
        onSelect={vi.fn()}
        onReconnect={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByText('Select RFP Template from Drive'))
    expect(screen.getByText('Loading files...')).toBeInTheDocument()
  })

  test('shows error state', async () => {
    mockUseDriveFiles.mockReturnValue({
      files: [],
      loading: false,
      error: 'Failed to fetch files',
      fetchFiles: mockFetchFiles,
    })

    render(
      <DrivePicker
        providerToken="token"
        onSelect={vi.fn()}
        onReconnect={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByText('Select RFP Template from Drive'))
    expect(screen.getByText('Failed to fetch files')).toBeInTheDocument()
  })

  test('calls onSelect when a file is clicked', async () => {
    mockUseDriveFiles.mockReturnValue({
      files: testFiles,
      loading: false,
      error: null,
      fetchFiles: mockFetchFiles,
    })

    const onSelect = vi.fn()
    render(
      <DrivePicker
        providerToken="token"
        onSelect={onSelect}
        onReconnect={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByText('Select RFP Template from Drive'))
    await userEvent.click(screen.getByText('RFP Template 2026.docx'))

    expect(onSelect).toHaveBeenCalledWith(testFiles[0])
  })
})
