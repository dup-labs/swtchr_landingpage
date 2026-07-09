// Schema do bloco e roteamento de gravação por destino.
// Decisões de design (spec v2):
// - metafields FLAT no namespace `swtchr`, um por campo — sem JSON no value,
//   porque o Twig da Nuvemshop não tem filtro de parse de JSON documentado
// - upsert find-then-write: GET por owner+namespace → PUT se a chave existe, POST se não
// - casing da API: escrita usa singular capitalizado ("Product"), leitura usa plural minúsculo no path

export const NAMESPACE = 'swtchr'
export const FIELD_KEYS = { image: 'block_image', text: 'block_text' }

export const OWNERS = {
  product: { write: 'Product', read: 'products' },
  category: { write: 'Category', read: 'categories' },
  page: { write: 'Page', read: 'pages' },
}

export function validateBlock({ image, text }) {
  const errors = []
  if (typeof text !== 'string' || !text.trim()) errors.push('texto é obrigatório')
  else if (text.length > 5000) errors.push('texto acima de 5000 caracteres')
  if (image) {
    try {
      const url = new URL(image)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error()
    } catch {
      errors.push('imagem deve ser uma URL http(s) válida')
    }
  }
  return errors
}

async function listOwnMetafields(client, ownerType, ownerId) {
  const owner = OWNERS[ownerType]
  const rows = await client.request(
    `/metafields/${owner.read}?owner_id=${ownerId}&namespace=${NAMESPACE}&per_page=200`
  )
  return Array.isArray(rows) ? rows : []
}

export async function getBlock(client, ownerType, ownerId) {
  const existing = await listOwnMetafields(client, ownerType, ownerId)
  const byKey = Object.fromEntries(existing.map((m) => [m.key, m]))
  return {
    image: byKey[FIELD_KEYS.image]?.value || '',
    text: byKey[FIELD_KEYS.text]?.value || '',
  }
}

export async function saveBlock(client, ownerType, ownerId, { image, text }) {
  const owner = OWNERS[ownerType]
  const existing = await listOwnMetafields(client, ownerType, ownerId)
  const byKey = Object.fromEntries(existing.map((m) => [m.key, m]))
  const desired = {
    [FIELD_KEYS.image]: (image || '').trim(),
    [FIELD_KEYS.text]: (text || '').trim(),
  }

  for (const [key, value] of Object.entries(desired)) {
    const current = byKey[key]
    if (!value) {
      // `value` é obrigatório na API — campo esvaziado é removido, não gravado como string vazia
      if (current) await client.request(`/metafields/${current.id}`, { method: 'DELETE' })
      continue
    }
    if (current) {
      if (current.value !== value) {
        await client.request(`/metafields/${current.id}`, { method: 'PUT', body: { value } })
      }
    } else {
      await client.request('/metafields', {
        method: 'POST',
        body: {
          namespace: NAMESPACE,
          key,
          value,
          owner_resource: owner.write,
          owner_id: Number(ownerId),
          description: 'SWTCHR POC — bloco imagem+texto',
        },
      })
    }
  }
  return { owner_resource: owner.write, owner_id: Number(ownerId) }
}

// Porta-dados da home: não existe `owner_resource: store`, então a home lê os metafields
// de um produto oculto via `['ID'] | get_products` no home.tpl (padrão provado no base-theme).
// Criado uma vez no primeiro save; o ID fica em .data/config.json e precisa ser colado no home.tpl.
export async function ensureHomeHolder(client, config, saveConfig) {
  if (config.homeProductId) {
    try {
      await client.request(`/products/${config.homeProductId}?fields=id`)
      return config.homeProductId
    } catch (err) {
      if (err.status !== 404) throw err
      // produto foi apagado na loja — recria e atualiza a config
    }
  }
  const product = await client.request('/products', {
    method: 'POST',
    body: {
      name: { pt: '[SWTCHR] Home Data — não excluir' },
      published: false,
    },
  })
  config.homeProductId = product.id
  saveConfig(config)
  return product.id
}
