import axios from 'axios'
import * as hmy from '../explorer/hmy'

export const fetchSuggestions = hexData => {
  const sig = hexData.slice(0, 10).toLowerCase()
  return (
    axios
      .get(
        `https://www.4byte.directory/api/v1/signatures/?hex_signature=${sig}`,
        {
          timeout: 1000,
        }
      )
      .then(res => res.data.results)
      // sort as first-in seem more relevant
      .then(res => res.sort((a, b) => a.id - b.id))
      .then(res => {
        // limit to 10
        if (res.length > 10) {
          res.length = 10
        }

        return res
          .map(r => createABI(hexData, r.text_signature))
          .filter(res => !!res)
      })
      .catch(err => {
        console.error(err)
        return null
      })
  )
}

const createABI = (hexData, stringSignature) => {
  const name = stringSignature.split('(')[0]
  const s = stringSignature.split('(')[1].split(')')[0]
  const inputs = s.split(',')

  const abi = [
    {
      constant: true,
      inputs: inputs
        .filter(i => !!i)
        .map((v, i) => ({ type: v, name: '$' + (i + 1) })),
      name: name,
      outputs: [],
      type: 'function',
      payable: false,
    },
  ]

  return getParams(hexData, abi)
}

const getParams = (hexData, abi) => {
  const sig = hexData.slice(0, 10).toLowerCase()
  const contractWithHelpers = hmy.default.contract(abi)
  const method = contractWithHelpers.abiModel.getMethod(sig)

  if (!method) {
    return false
  }

  try {
    const inputValues = contractWithHelpers.decodeInput(hexData)
    const outputValues = method.decodeOutputs(hexData)

    const inputs = method.inputs.map((o, i) => ({
      name: o.name,
      type: o.type,
      value: inputValues.params[i],
    }))
    const outputs = method.outputs.map((o, i) => ({
      name: o.name,
      type: o.type,
      value: outputValues[i],
    }))

    return { method, inputs, outputs }
  } catch (e) {
    return false
  }
}
