// navbar test can be run on every page, but it takes forever. set do expensive to false to do it just on two pages.
const DO_EXPENSIVE = false;

// TODO: figure out why this test keeps lagging.

const LOCATIONS = DO_EXPENSIVE
    ? ['/', '/about/', '/projects/', '/get-started/', '/blog/']
    : ['/', '/about/'];

describe("Navbar", () => {
    describe("Navbar for page", () => {
        LOCATIONS.forEach(loc => {
            beforeEach(() => {
                cy.visit(`http://localhost:8080${loc}`)
            })
            context("large", () => {
                beforeEach(() => {
                    cy.viewport('macbook-13')
                })
                it("shows the topbar and site title", () => {
                    cy.get("[data-test='topbar']").should('be.visible');
                    cy.get("[data-test='sitetitle']").should('be.visible').contains("Rick Henry Development");
                })
                it("shows the navigation links and not the menu button", () => {
                    cy.get("[data-test='desktop-nav']").should('be.visible');
                    cy.get("[data-test='mobile-nav-button']").should('not.be.visible');
                })
                it("doesn't show the mobile nav menus", () => {
                    cy.get("[data-test='medium-nav-menu']").should('not.be.visible');
                    cy.get("[data-test='mobile-nav-menu']").should('not.be.visible');
                })
                it("shows the correct page links", () => {
                    cy.get("[data-test='nav-link-1']").should('not.exist'); // First link is to the homepage and is desktop only
                    cy.get("[data-test='nav-link-2']").should('be.visible').contains('Projects').invoke('attr', 'href').should('eq', '/projects/');
                    cy.get("[data-test='nav-link-3']").should('be.visible').contains('About').invoke('attr', 'href').should('eq', '/about/');
                    cy.get("[data-test='nav-link-4']").should('be.visible').contains('Blog').invoke('attr', 'href').should('eq', '/blog/');
                    cy.get("[data-test='nav-cta-5']").should('be.visible').contains('Get Started').invoke('attr', 'href').should('eq', '/get-started/');
                })
                context("goes to correct pages", () => {
                    if (loc !== '/projects/') {
                        it("goes to the projects page", () => {
                            cy.get("[data-test='nav-link-2']").click();
                            cy.location('pathname').should('eq', '/projects/')
                        })
                    }
                    if (loc !== '/about/') {
                        it("goes to the about page", () => {
                            cy.get("[data-test='nav-link-3']").click();
                            cy.location('pathname').should('eq', '/about/')
                        })
                    }
                    if (loc !== '/blog/') {
                        it("goes to the blog page", () => {
                            cy.get("[data-test='nav-link-4']").click();
                            cy.location('pathname').should('eq', '/blog/')
                        })
                    }
                    if (loc !== '/get-started/') {
                        it("goes to the get started page", () => {
                            cy.get("[data-test='nav-cta-5']").click();
                            cy.location('pathname').should('eq', '/get-started/')
                        })
                    }
                    if (loc !== '/') {
                        it("site title goes to the homepage", () => {
                            cy.get("[data-test='topbar'] > [data-test='sitetitle']").click();
                            cy.location('pathname').should('eq', '/');
                        })
                    }
                })
            })

            context("medium", () => {
                beforeEach(() => {
                    cy.viewport('ipad-mini')
                })
                it("shows the topbar and site title", () => {
                    cy.get("[data-test='topbar']").should('be.visible');
                    cy.get("[data-test='sitetitle']").should('be.visible').contains("Rick Henry Development");
                })
                it("shows the navigation menu button and not the navigation links", () => {
                    cy.get("[data-test='desktop-nav']").should('not.be.visible');
                    cy.get("[data-test='mobile-nav-button']").should('be.visible').contains('Menu');
                })
                it("doesn't show the mobile nav menus", () => {
                    cy.get("[data-test='medium-nav-menu']").should('not.be.visible');
                    cy.get("[data-test='mobile-nav-menu']").should('not.be.visible');
                })
                it("shows medium nav menu when the menu button is clicked", () => {
                    cy.get("[data-test='mobile-nav-button']").click();
                    cy.get("[data-test='medium-nav-menu']").should('be.visible');
                })
                it("closes nav menu when close button is clicked", () => {
                    cy.get("[data-test='mobile-nav-button']").click();
                    cy.get("[data-test='medium-nav-menu']").should('be.visible');
                    cy.get("[data-test='close-medium-nav-button']").click();
                    cy.get("[data-test='medium-nav-menu']").should('not.be.visible');
                })
                it("shows correct nav links when medium nav menu is open", () => {
                    cy.get("[data-test='mobile-nav-button']").click();
                    cy.get("[data-test='medium-nav-menu']").should('be.visible');
                    cy.get("[data-test='medium-nav-1']").should('be.visible').contains('Home').invoke('attr', 'href').should('eq', '/');
                    cy.get("[data-test='medium-nav-2']").should('be.visible').contains('Projects').invoke('attr', 'href').should('eq', '/projects/');
                    cy.get("[data-test='medium-nav-3']").should('be.visible').contains('About').invoke('attr', 'href').should('eq', '/about/');
                    cy.get("[data-test='medium-nav-4']").should('be.visible').contains('Blog').invoke('attr', 'href').should('eq', '/blog/');
                    cy.get("[data-test='medium-cta-5']").should('be.visible').contains('Get Started').invoke('attr', 'href').should('eq', '/get-started/');
                })
                context("goes to correct pages", () => {
                    beforeEach(() => {
                        cy.get("[data-test='mobile-nav-button']").click();
                    })
                    if (loc !== '/projects/') {
                        it("goes to the projects page", () => {
                            cy.get("[data-test='medium-nav-2']").click();
                            cy.location('pathname').should('eq', '/projects/')
                        })
                    }
                    if (loc !== '/about/') {
                        it("goes to the about page", () => {
                            cy.get("[data-test='medium-nav-3']").click();
                            cy.location('pathname').should('eq', '/about/')
                        })
                    }
                    if (loc !== '/blog/') {
                        it("goes to the blog page", () => {
                            cy.get("[data-test='medium-nav-4']").click();
                            cy.location('pathname').should('eq', '/blog/')
                        })
                    }
                    if (loc !== '/get-started/') {
                        it("goes to the get started page", () => {
                            cy.get("[data-test='medium-cta-5']").click();
                            cy.location('pathname').should('eq', '/get-started/')
                        })
                    }
                    if (loc !== '/') {
                        it("goes to the homepage", () => {
                            cy.get("[data-test='close-medium-nav-button']").click();
                            cy.get("[data-test='mobile-nav-button']").click();
                            cy.get("[data-test='medium-nav-1']").click();
                            cy.location('pathname').should('eq', '/');
                        })
                    }
                })
            })

            context("small", () => {
                beforeEach(() => {
                    cy.viewport('iphone-5')
                })
                it("shows the topbar and site title", () => {
                    cy.get("[data-test='topbar']").should('be.visible');
                    cy.get("[data-test='sitetitle']").should('be.visible').contains("Rick Henry Development");
                })
                it("shows the navigation menu button and not the navigation links", () => {
                    cy.get("[data-test='desktop-nav']").should('not.be.visible');
                    cy.get("[data-test='mobile-nav-button']").should('be.visible').contains('Menu');
                })
                it("doesn't show the mobile nav menus", () => {
                    cy.get("[data-test='medium-nav-menu']").should('not.be.visible');
                    cy.get("[data-test='mobile-nav-menu']").should('not.be.visible');
                })
                it("shows mobile nav menu on click", () => {
                    cy.get("[data-test='mobile-nav-button']").click();
                    cy.get("[data-test='mobile-nav-menu']").should('be.visible');
                })
                it("closes nav menu when close button is clicked", () => {
                    cy.get("[data-test='mobile-nav-button']").click();
                    cy.get("[data-test='mobile-nav-menu']").should('be.visible');
                    cy.get("[data-test='close-mobile-nav-button']").click();
                    cy.get("[data-test='mobile-nav-menu']").should('not.be.visible');
                })
                it("shows correct nav links when mobile nav menu is open", () => {
                    cy.get("[data-test='mobile-nav-button']").click();
                    cy.get("[data-test='mobile-nav-menu']").should('be.visible');
                    cy.get("[data-test='mobile-nav-1']").should('be.visible').contains('Home').invoke('attr', 'href').should('eq', '/');
                    cy.get("[data-test='mobile-nav-2']").should('be.visible').contains('Projects').invoke('attr', 'href').should('eq', '/projects/');
                    cy.get("[data-test='mobile-nav-3']").should('be.visible').contains('About').invoke('attr', 'href').should('eq', '/about/');
                    cy.get("[data-test='mobile-nav-4']").should('be.visible').contains('Blog').invoke('attr', 'href').should('eq', '/blog/');
                    cy.get("[data-test='mobile-cta-5']").should('be.visible').contains('Get Started').invoke('attr', 'href').should('eq', '/get-started/');
                })
                context("goes to correct pages", () => {
                    beforeEach(() => {
                        cy.get("[data-test='mobile-nav-button']").click();
                    })
                    if (loc !== '/projects/') {
                        it("goes to the projects page", () => {
                            cy.get("[data-test='mobile-nav-2']").click();
                            cy.location('pathname').should('eq', '/projects/')
                        })
                    }
                    if (loc !== '/about/') {
                        it("goes to the about page", () => {
                            cy.get("[data-test='mobile-nav-3']").click();
                            cy.location('pathname').should('eq', '/about/')
                        })
                    }
                    if (loc !== '/blog/') {
                        it("goes to the blog page", () => {
                            cy.get("[data-test='mobile-nav-4']").click();
                            cy.location('pathname').should('eq', '/blog/')
                        })
                    }
                    if (loc !== '/get-started/') {
                        it("goes to the get started page", () => {
                            cy.get("[data-test='mobile-cta-5']").click();
                            cy.location('pathname').should('eq', '/get-started/')
                        })
                    }
                    if (loc !== '/') {
                        // it("goes to the homepage", () => {
                        //     cy.get("[data-test='mobile-nav-button']").click();
                        //     cy.get("[data-test='mobile-nav-1']").click();
                        //     cy.location('pathname').should('eq', '/');
                        // })
                    }
                    if (loc !== '/') {
                        // it("site title in nav menu goes to homepage", () => {
                        //     cy.get("[data-test='mobile-nav-button']").click();
                        //     cy.get("[data-test='mobile-nav-menu'] [data-test='sitetitle']").click();
                        //     cy.location('pathname').should('eq', '/');
                        // })
                    }
                })
            })

        })
    })
})
