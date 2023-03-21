describe("About Page", () => {
    beforeEach(() => {
        cy.visit("http://localhost:8080/about/")
    })
    context("Hero", () => {
        it("has correct title and subtitle", () => {
            cy.get("[data-test='hero-title']").contains("Hi, I'm Rick");
            cy.get("[data-test='hero-subtitle']").contains("Thanks for visiting my site");
        })
    })
    it("has the bio section", () => {
        cy.get("[data-test='bio-section']").should('be.visible');
        cy.get("[data-test='bio-heading-1']").should('be.visible');
    })
    it("has footer section", () => {
        cy.get("[data-test='global-footer']").should('be.visible');
        cy.get("[data-test='sitemap']").should('be.visible');
        cy.get("[data-test='footer-logo']").should('be.visible');
        cy.get("[data-test='page-source']").should('be.visible');
        cy.get("[data-test='copyright']").should('be.visible');
    })

})
