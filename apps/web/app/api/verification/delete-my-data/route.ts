import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// TODO: Implement full "delete my data" / GDPR compliance
// - Delete or anonymize user's DriverVerificationSubmission documents from storage
// - Delete related audit logs or anonymize
// - Consider account deletion vs data-only deletion
// - Add admin tool to delete documents: /api/admin/verification/[id]/documents
export async function DELETE(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Stub: Not implemented yet
  return NextResponse.json(
    {
      error: 'Delete my data is not yet implemented. Contact support for manual data deletion.',
      todo: 'Implement document deletion from storage and DB cleanup',
    },
    { status: 501 }
  )
}
