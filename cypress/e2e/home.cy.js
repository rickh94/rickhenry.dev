describe('Homepage', () => {
    beforeEach(() => {
        cy.visit("http://localhost:8080")
    })
    context("Hero", () => {
        it("has correct title and subtitle", () => {
            cy.get("[data-test='hero-title']").contains("Simple – Fast – Beautiful")
            cy.get("[data-test='hero-subtitle']").contains("The website you need with no nonsense")
        })

        it('has correct call to action', () => {
            cy.get("[data-test='cta']").should('exist');
            cy.get("[data-test='cta-link']").should('exist').contains("Get Started").invoke('attr', 'href').should('eq', '/get-started');
        })
    })

    context("Sections", () => {
        it("has service section", () => {
            cy.get("[data-test='services-section']").should('be.visible');
            cy.get("[data-test='service-display']").should('have.length', 4);
        })
        it("has projects section", () => {
            cy.get("[data-test='projects-section']").should('be.visible');
            cy.get("[data-test='project-display']").should('have.length.gte', 3).should('have.length.lt', 6);
        })
        it("has contact form section", () => {
            cy.get("[data-test='contact-form-section']").should('be.visible');
            cy.get("[data-test='contact-form']").should('be.visible');
        })
        it("has footer section", () => {
            cy.get("[data-test='global-footer']").should('be.visible');
            cy.get("[data-test='sitemap']").should('be.visible');
            cy.get("[data-test='footer-logo']").should('be.visible');
            cy.get("[data-test='page-source']").should('be.visible');
            cy.get("[data-test='copyright']").should('be.visible');
        })
    })
})
