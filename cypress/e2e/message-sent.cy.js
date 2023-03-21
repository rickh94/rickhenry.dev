describe("Message Sent Page", () => {
    beforeEach(() => {
        cy.visit(Cypress.env("URL") + "/message-sent")
    })
    it("has hero title and subtitle", () => {
        cy.get("[data-test='hero-title']").should('be.visible').contains("Thank you!")
        cy.get("[data-test='hero-subtitle']").should('be.visible').contains("Your message was sent")
    })
    it("has back to homepage button", () => {
       cy.get("[data-test='homepage-button']").should('be.visible').contains("Back to Homepage").click();
       cy.location('pathname').should('eq', '/')
    })
})
