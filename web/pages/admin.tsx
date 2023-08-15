import { Page } from 'web/components/page'
import { Grid, _ as r } from 'gridjs-react'
import 'gridjs/dist/theme/mermaid.css'
import { html } from 'gridjs'
import dayjs from 'dayjs'
import { usePrivateUsers, useUsers } from 'web/hooks/use-users'
import Custom404 from './404'
import { useContracts } from 'web/hooks/use-contracts'
import { mapKeys } from 'lodash'
import { useAdmin } from 'web/hooks/use-admin'
import { contractPath } from 'web/lib/firebase/contracts'
import { redirectIfLoggedOut } from 'web/lib/firebase/server-auth'
import { useEffect, useState } from 'react'
import { getFirstDayProfit } from 'web/lib/firebase/users'

export const getServerSideProps = redirectIfLoggedOut('/')

function avatarHtml(avatarUrl: string) {
  return `<img
  class="h-10 w-10 rounded-full bg-gray-400 flex items-center justify-center"
  src="${avatarUrl}"
  alt=""
/>`
}

function UsersTable() {
  const users = useUsers()
  const privateUsers = usePrivateUsers()

  // Map private users by user id
  const privateUsersById = mapKeys(privateUsers, 'id')

  const [profitByUser, setProfitByUser] = useState<{
    [userId: string]: number
  }>({})

  useEffect(() => {
    Promise.all(users.map((user) => getFirstDayProfit(user.id))).then(
      (firstDayProfits) => {
        setProfitByUser(
          Object.fromEntries(
            users.map((user, i) => [
              user.id,
              user.profitCached.allTime - firstDayProfits[i],
            ])
          )
        )
      }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users.map((user) => user.id).join(',')])

  // For each user, set their email from the PrivateUser
  const fullUsers = users
    .map((user) => {
      return {
        email: privateUsersById[user.id]?.email,
        profit: profitByUser[user.id] ?? 0,
        ip: privateUsersById[user.id]?.initialIpAddress,
        ...user,
      }
    })
    .sort((a, b) => b.createdTime - a.createdTime)

  function exportCsv() {
    const lines = [
      [
        'Email',
        'Name',
        'Balance',
        'Profit',
        'Number bets',
        'Number markets with S$50 bet',
        'IP Address',
      ],
    ].concat(
      fullUsers.map((u) => [
        u.email ?? '',
        u.name,
        Math.round(u.balance).toString(),
        Math.round(profitByUser[u.id] ?? 0).toString(),
        (u.totalBets ?? 0).toString(),
        (u.betMoreThanFiftyOnContractsCount ?? 0).toString(),
        u.ip ?? '',
      ])
    )
    const csv = lines.map((line) => line.join(', ')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'manifold-users.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Grid
        data={fullUsers}
        columns={[
          {
            id: 'avatarUrl',
            name: 'Avatar',
            formatter: (cell) => html(avatarHtml(cell as string)),
          },
          {
            id: 'username',
            name: 'Username',
            formatter: (cell) =>
              html(`<a
              class="hover:underline hover:decoration-indigo-400 hover:decoration-2"
              href="/${cell}">@${cell}</a>`),
          },
          {
            id: 'name',
            name: 'Name',
            formatter: (cell) =>
              html(`<span class="whitespace-nowrap">${cell}</span>`),
          },
          {
            id: 'email',
            name: 'Email',
          },
          {
            id: 'createdTime',
            name: 'Created',
            formatter: (cell) =>
              html(
                `<span class="whitespace-nowrap">${dayjs(cell as number).format(
                  'MMM D, h:mma'
                )}</span>`
              ),
          },
          {
            id: 'balance',
            name: 'Balance',
            formatter: (cell) => (cell as number).toFixed(0),
          },
          {
            id: 'profit',
            name: 'profit',
            formatter: (cell) => (cell as number).toFixed(0),
          },
          {
            id: 'id',
            name: 'ID',
            formatter: (cell) =>
              html(`<a
              class="hover:underline hover:decoration-indigo-400 hover:decoration-2"
              href="https://console.firebase.google.com/project/mantic-markets/firestore/data/~2Fusers~2F${cell}">${cell}</a>`),
          },
        ]}
        search={true}
        sort={true}
        pagination={{
          enabled: true,
          limit: 25,
        }}
      />
      <button className="btn" onClick={exportCsv}>
        Export emails to CSV
      </button>
    </>
  )
}

function ContractsTable() {
  const contracts = useContracts() ?? []

  // Sort users by createdTime descending, by default
  const displayContracts = contracts
    .sort((a, b) => b.createdTime - a.createdTime)
    .map((contract) => {
      // Render a clickable question. See https://gridjs.io/docs/examples/react-cells for docs
      const questionLink = r(
        <div className="w-60">
          <a
            className="hover:underline hover:decoration-indigo-400 hover:decoration-2"
            href={contractPath(contract)}
          >
            {contract.question}
          </a>
        </div>
      )
      return { questionLink, ...contract }
    })

  return (
    <Grid
      data={displayContracts}
      columns={[
        {
          id: 'creatorUsername',
          name: 'Username',
          formatter: (cell) =>
            html(`<a
              class="hover:underline hover:decoration-indigo-400 hover:decoration-2"
              target="_blank"
              href="/${cell}">@${cell}</a>`),
        },
        {
          id: 'questionLink',
          name: 'Question',
        },
        {
          id: 'volume24Hours',
          name: '24h vol',
          formatter: (cell) => (cell as number).toFixed(0),
        },
        {
          id: 'createdTime',
          name: 'Created time',
          formatter: (cell) =>
            html(
              `<span class="whitespace-nowrap">${dayjs(cell as number).format(
                'MMM D, h:mma'
              )}</span>`
            ),
        },
        {
          id: 'closeTime',
          name: 'Close time',
          formatter: (cell) =>
            html(
              `<span class="whitespace-nowrap">${dayjs(cell as number).format(
                'MMM D, h:mma'
              )}</span>`
            ),
        },
        {
          id: 'resolvedTime',
          name: 'Resolved time',
          formatter: (cell) =>
            html(
              `<span class="whitespace-nowrap">${dayjs(cell as number).format(
                'MMM D, h:mma'
              )}</span>`
            ),
        },
        {
          id: 'visibility',
          name: 'Visibility',
          formatter: (cell) => cell,
        },
        {
          id: 'id',
          name: 'ID',
          formatter: (cell) =>
            html(`<a
              class="hover:underline hover:decoration-indigo-400 hover:decoration-2"
              target="_blank"
              href="https://console.firebase.google.com/project/mantic-markets/firestore/data/~2Fcontracts~2F${cell}">${cell}</a>`),
        },
      ]}
      search={true}
      sort={true}
      pagination={{
        enabled: true,
        limit: 25,
      }}
    />
  )
}

export default function Admin() {
  return useAdmin() ? (
    <Page>
      <UsersTable />
      <ContractsTable />
    </Page>
  ) : (
    <Custom404 />
  )
}
