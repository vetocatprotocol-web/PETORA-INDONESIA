import { describe, it, expect } from "vitest"
import { serviceName } from "./index"

describe("petora-core", () => {
  it("exports the service name", () => {
    expect(serviceName).toBe("petora-core")
  })
})
