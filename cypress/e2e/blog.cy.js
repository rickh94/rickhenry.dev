describe("Blog Page", () => {
    beforeEach(() => {
        cy.visit("http://localhost:8080/blog/")
    })
    context("Hero", () => {
        it("has correct title and subtitle", () => {
            cy.get("[data-test='hero-title']").contains("Welcome to my blog");
            cy.get("[data-test='hero-subtitle']").contains("I write about what I'm working on");
        })
    })
    it("has blog posts displayed", () => {
        cy.get("[data-test='blog-post-card']").should('have.length.gt', 2);
    })
    it("has footer section", () => {
        cy.get("[data-test='global-footer']").should('be.visible');
        cy.get("[data-test='sitemap']").should('be.visible');
        cy.get("[data-test='footer-logo']").should('be.visible');
        cy.get("[data-test='page-source']").should('be.visible');
        cy.get("[data-test='copyright']").should('be.visible');
    })
})
