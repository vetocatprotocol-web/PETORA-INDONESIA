export type FieldType = "text" | "secret" | "boolean" | "number" | "select" | "array"

export type ConfigField = {
  key: string
  label: string
  type: FieldType
  required?: boolean
  secret?: boolean
  help?: string
  options?: { label: string; value: string }[]
}

export type AdapterCategory = "payment" | "whatsapp" | "email" | "storage"

export type AdapterDefinition = {
  key: string
  category: AdapterCategory
  name: string
  configFields: ConfigField[]
  credentialFields: ConfigField[]
  supportsSandbox: boolean
}

const registry = new Map<string, AdapterDefinition>()

export function registerAdapter(def: AdapterDefinition): void {
  registry.set(def.key, def)
}

export function getAdapter(key: string): AdapterDefinition | undefined {
  return registry.get(key)
}

export function listAdapters(category?: AdapterCategory): AdapterDefinition[] {
  const all = [...registry.values()]
  return category ? all.filter((a) => a.category === category) : all
}

export function registerBuiltinAdapters(): void {
  if (registry.size > 0) return
  registerAdapter({
    key: "midtrans",
    category: "payment",
    name: "Midtrans",
    supportsSandbox: true,
    configFields: [
      { key: "is_production", label: "Production mode", type: "boolean", required: true },
      { key: "enabled_methods", label: "Enabled methods", type: "array" }
    ],
    credentialFields: [
      { key: "server_key", label: "Server Key", type: "secret", required: true, secret: true },
      { key: "client_key", label: "Client Key", type: "text", required: true }
    ]
  })
  registerAdapter({
    key: "xendit",
    category: "payment",
    name: "Xendit",
    supportsSandbox: true,
    configFields: [{ key: "enabled_methods", label: "Enabled methods", type: "array" }],
    credentialFields: [
      {
        key: "secret_key",
        label: "Secret Key",
        type: "secret",
        required: true,
        secret: true
      },
      {
        key: "callback_token",
        label: "Callback Verification Token",
        type: "secret",
        required: true,
        secret: true
      }
    ]
  })
  registerAdapter({
    key: "whatsapp_cloud",
    category: "whatsapp",
    name: "WhatsApp Cloud API",
    supportsSandbox: true,
    configFields: [
      { key: "phone_number_id", label: "Phone Number ID", type: "text", required: true },
      { key: "business_account_id", label: "WABA ID", type: "text", required: true }
    ],
    credentialFields: [
      { key: "access_token", label: "Access Token", type: "secret", required: true, secret: true },
      {
        key: "verify_token",
        label: "Webhook Verify Token",
        type: "secret",
        required: true,
        secret: true
      },
      { key: "app_secret", label: "App Secret", type: "secret", required: true, secret: true }
    ]
  })
  registerAdapter({
    key: "whatsapp_gateway",
    category: "whatsapp",
    name: "WhatsApp Gateway",
    supportsSandbox: false,
    configFields: [
      { key: "base_url", label: "Base URL", type: "text", required: true },
      { key: "device_id", label: "Device ID", type: "text" }
    ],
    credentialFields: [
      { key: "api_key", label: "API Key", type: "secret", required: true, secret: true }
    ]
  })
  registerAdapter({
    key: "resend",
    category: "email",
    name: "Resend",
    supportsSandbox: true,
    configFields: [
      { key: "from_email", label: "From Email", type: "text", required: true },
      { key: "from_name", label: "From Name", type: "text" }
    ],
    credentialFields: [
      { key: "api_key", label: "API Key", type: "secret", required: true, secret: true }
    ]
  })
  registerAdapter({
    key: "storage_local",
    category: "storage",
    name: "Local Storage",
    supportsSandbox: false,
    configFields: [{ key: "base_path", label: "Base Path", type: "text", required: true }],
    credentialFields: []
  })
  registerAdapter({
    key: "storage_s3",
    category: "storage",
    name: "S3 Compatible Storage",
    supportsSandbox: false,
    configFields: [
      { key: "bucket", label: "Bucket", type: "text", required: true },
      { key: "region", label: "Region", type: "text" },
      { key: "endpoint", label: "Endpoint", type: "text" },
      { key: "force_path_style", label: "Force Path Style", type: "boolean" }
    ],
    credentialFields: [
      {
        key: "access_key_id",
        label: "Access Key ID",
        type: "secret",
        required: true,
        secret: true
      },
      {
        key: "secret_access_key",
        label: "Secret Access Key",
        type: "secret",
        required: true,
        secret: true
      }
    ]
  })
}
