describe("Projects Page", () => {
    beforeEach(() => {
        cy.visit("http://localhost:8080/projects/")
    })
    context("Hero", () => {
        it("has correct title and subtitle", () => {
            cy.get("[data-test='hero-title']").contains("Past Projects");
            cy.get("[data-test='hero-subtitle']").contains("Here are some more things I've built");
        })
    })
    context("Project Section", () => {
        it("has the projects section", () => {
            cy.get("[data-test='projects-page-projects']").should('be.visible');
        })
        it("has at least 3 projects displayed", () => {
            cy.get("[data-test='project-display']").should('have.length.gte', 3);
        })
    })
    it("has footer section", () => {
        cy.get("[data-test='global-footer']").should('be.visible');
        cy.get("[data-test='sitemap']").should('be.visible');
        cy.get("[data-test='footer-logo']").should('be.visible');
        cy.get("[data-test='page-source']").should('be.visible');
        cy.get("[data-test='copyright']").should('be.visible');
    })
})
