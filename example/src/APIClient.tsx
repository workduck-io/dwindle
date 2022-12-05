import React, { useState } from 'react'

import { kyClient } from '@workduck-io/dwindle'

export const APIClient = () => {
  const [resp, setResp] = useState<string>()
  const getAllNamespaces = async () => {
    const data = await kyClient.get('http://localhost:5002/api/v1/namespace/all', {
      headers: {
        'mex-workspace-id': '<WORKSPACE_ID>',
      },
    })

    setResp(JSON.stringify(await data.json()))
  }

  return (
    <>
      <h3>Make API Requests using the KY Client</h3>
      <button onClick={getAllNamespaces}>Get All Namespaces</button>
      {resp && <div>{resp}</div>}
    </>
  )

  return null
}
