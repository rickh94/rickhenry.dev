describe("Get Started Page", () => {
    beforeEach(() => {
        cy.intercept("https://unpkg.com/@botpoison/browser", {statusCode: 200, body: ""});
        cy.visit(Cypress.env("URL") + "/get-started/")
    })
    context("Hero", () => {
        it("has correct title and subtitle", () => {
            cy.get("[data-test='hero-title']").contains("Get Started");
            cy.get("[data-test='hero-subtitle']").contains("Send me a message below");
        })

    })
    it("renders the contact form", () => {
        cy.get("[data-test='contact-form']").should("be.visible");
    })
    it("has footer section", () => {
        cy.get("[data-test='global-footer']").should('be.visible');
        cy.get("[data-test='sitemap']").should('be.visible');
        cy.get("[data-test='footer-logo']").should('be.visible');
        cy.get("[data-test='page-source']").should('be.visible');
        cy.get("[data-test='copyright']").should('be.visible');
    })
    context("contact form works", () => {
        ['macbook-13', 'ipad-mini', 'iphone-5'].forEach(size => {
            beforeEach(() => {
                cy.viewport(size)
            })
            context(`${size} form test`, () => {
                it("submits fully completed form correctly", () => {
                    cy.get("[data-test='contact-name']").type("Test Person");
                    cy.get("[data-test='contact-email']").type("test@example.com");
                    cy.get("[data-test='contact-website']").type("http://example.com");
                    cy.get("[data-test='contact-message']").type("This is a test message");
                    cy.intercept(Cypress.env("FORMSPARK_TESTING") + "*", (req) => {
                        expect(req.query['name']).to.equal("Test Person");
                        expect(req.query['email']).to.equal("test@example.com");
                        expect(req.query['website']).to.equal("http://example.com");
                        expect(req.query['message']).to.equal("This is a test message");
                        expect(req.query['_redirect']).to.equal(Cypress.env("URL") + "/message-sent");
                        expect(req.query['_error']).to.equal(Cypress.env("URL") + "/message-failed");
                        req.reply({
                            statusCode: 301,
                            headers: {
                                Location: req.query['_redirect']
                            }
                        })
                    });
                    cy.get("[data-test='contact-submit']").click();
                })
                it("submits form with required fields", () => {
                    cy.get("[data-test='contact-name']").type("Test Person");
                    cy.get("[data-test='contact-email']").type("test@example.com");
                    cy.get("[data-test='contact-message']").type("This is a test message2");
                    cy.intercept(Cypress.env("FORMSPARK_TESTING") + "*", (req) => {
                        expect(req.query['name']).to.equal("Test Person");
                        expect(req.query['email']).to.equal("test@example.com");
                        expect(req.query['message']).to.equal("This is a test message2");
                        req.reply({
                            statusCode: 301,
                            headers: {
                                Location: req.query['_redirect']
                            }
                        })
                    });
                    cy.get("[data-test='contact-submit']").click();
                })
                it("does not submit without name", () => {
                    cy.get("[data-test='contact-email']").type("test@example.com");
                    cy.get("[data-test='contact-message']").type("This is a test message2");
                    cy.intercept(Cypress.env("FORMSPARK_TESTING") + "*", (req) => {
                        expect(false).to.be.true;
                        // this should not be reached
                    });
                    cy.get("[data-test='contact-submit']").click();
                })
                it("does not submit without email", () => {
                    cy.get("[data-test='contact-name']").type("Test Person");
                    cy.get("[data-test='contact-message']").type("This is a test message2");
                    cy.intercept(Cypress.env("FORMSPARK_TESTING") + "*", (req) => {
                        expect(false).to.be.true;
                        // this should not be reached
                    });
                    cy.get("[data-test='contact-submit']").click();
                })
                it("does not submit without message", () => {
                    cy.get("[data-test='contact-name']").type("Test Person");
                    cy.get("[data-test='contact-email']").type("test@example.com");
                    cy.intercept(Cypress.env("FORMSPARK_TESTING") + "*", (req) => {
                        expect(false).to.be.true;
                        // this should not be reached
                    });
                    cy.get("[data-test='contact-submit']").click();
                })
                it("does not take invalid email", () => {
                    cy.get("[data-test='contact-name']").type("Test Person");
                    cy.get("[data-test='contact-email']").type("not a valid email");
                    cy.get("[data-test='contact-message']").type("This is a test message2");
                    cy.intercept(Cypress.env("FORMSPARK_TESTING") + "*", (req) => {
                        expect(false).to.be.true;
                        // this should not be reached
                    });
                    cy.get("[data-test='contact-submit']").click();
                })
            })
        })
    })
})
