import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { PartyBadge } from "@/components/party-badge"

describe("PartyBadge", () => {
  it("renders abbreviation and count", () => {
    render(<PartyBadge abbreviation="S" color="#a82721" count={48} />)
    expect(screen.getByText("S")).toBeDefined()
    expect(screen.getByText("48")).toBeDefined()
  })

  it("applies party color to dot", () => {
    const { container } = render(<PartyBadge abbreviation="V" color="#254264" count={15} />)
    const dot = container.querySelector("[data-party-dot]")
    expect(dot).toBeDefined()
    // jsdom normalizes hex to rgb when React sets inline styles
    expect(dot?.getAttribute("style")).toContain("background-color: rgb(37, 66, 100)")
  })
})
