import clsx from 'clsx'
import { User } from 'common/user'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Row } from 'web/components/layout/row'
import { firebaseLogin } from 'web/lib/firebase/users'
import { withTracking } from 'web/lib/service/analytics'
import { leaveGroup, SearchGroupInfo } from 'web/lib/supabase/groups'
import { Button } from '../buttons/button'
import { ConfirmationButton } from '../buttons/confirmation-button'
import { Subtitle } from '../widgets/subtitle'
import { joinGroup } from 'web/lib/firebase/api'
import { useIsMobile } from 'web/hooks/use-is-mobile'

export const groupButtonClass = 'text-ink-700 hover:text-ink-800'

function LeavePrivateGroupButton(props: {
  group: SearchGroupInfo
  user: User | undefined | null
  setIsMember: (isMember: boolean) => void
  isMobile?: boolean
  disabled?: boolean
  className?: string
}) {
  const { group, user, setIsMember, isMobile, disabled, className } = props
  const leavePrivateGroup = user
    ? withTracking(() => {
        leaveGroup(group.id, user.id)
          .then(() => setIsMember(false))
          .catch(() => {
            toast.error('Failed to unfollow group')
          })
      }, 'leave group')
    : firebaseLogin

  return (
    <>
      <ConfirmationButton
        openModalBtn={{
          className: clsx(
            isMobile
              ? 'bg-inherit hover:bg-inherit inline-flex items-center justify-center disabled:cursor-not-allowed shadow-none px-1'
              : '',
            className
          ),
          color: isMobile ? 'none' : 'indigo',
          disabled: disabled,
          label: isMobile ? '' : ' Leave',
        }}
        cancelBtn={{
          label: 'Cancel',
        }}
        submitBtn={{
          label: 'Leave group',
          color: 'red',
        }}
        onSubmit={() => {
          leavePrivateGroup()
        }}
      >
        <LeavePrivateGroupModal />
      </ConfirmationButton>
    </>
  )
}

export function LeavePrivateGroupModal() {
  return (
    <>
      <Subtitle className="!mt-0">Are you sure?</Subtitle>
      <p className="text-sm">
        You can't rejoin this group unless invited back. You also won't be able
        to access any questions you have shares in.
      </p>
    </>
  )
}

export function JoinOrLeaveGroupButton(props: {
  group: SearchGroupInfo
  isMember: boolean | undefined
  user: User | undefined | null
}) {
  const { group, user } = props
  const isMobile = useIsMobile()

  // Handle both non-live and live updating isMember state
  const [isMember, setIsMember] = useState(props.isMember)
  useEffect(() => setIsMember(props.isMember), [props.isMember])

  if (group.privacyStatus === 'private') {
    return (
      <LeavePrivateGroupButton
        group={group}
        setIsMember={setIsMember}
        user={user}
        isMobile={isMobile}
      />
    )
  }

  const unfollow = user
    ? withTracking(() => {
        leaveGroup(group.id, user.id)
          .then(() => setIsMember(false))
          .catch(() => {
            toast.error('Failed to unfollow category')
          })
      }, 'leave group')
    : firebaseLogin
  const follow = user
    ? withTracking(() => {
        joinGroup({ groupId: group.id })
          .then(() => setIsMember(true))
          .catch((e) => {
            console.error(e)
            toast.error('Failed to follow category')
          })
      }, 'join group')
    : firebaseLogin

  if (isMember) {
    return (
      <Button
        size="2xs"
        color="none"
        className="w-16 bg-gray-400 text-white hover:bg-gray-500 dark:bg-gray-700 dark:hover:bg-gray-600"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          unfollow()
        }}
      >
        <Row className="gap-1">Unfollow</Row>
      </Button>
    )
  }

  return (
    <Button
      size="2xs"
      color="indigo"
      className="w-16"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        follow()
      }}
    >
      <Row className="gap-1">Follow</Row>
    </Button>
  )
}
