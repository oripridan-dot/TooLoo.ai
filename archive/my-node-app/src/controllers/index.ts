class IndexController {
    public async getIndex(req, res) {
        res.send("Welcome to the Index!");
    }

    public async getAnotherRoute(req, res) {
        res.send("This is another route!");
    }

    // Add more route handlers as needed
}

export default IndexController;