'use strict';

const ConnectionManager = require('./connectionmanager');

class WebRtcConnectionManager {
    constructor() {
        this.connectionManager = new ConnectionManager();
    }

    static create() {
        return new WebRtcConnectionManager();
    }

    async createConnection() {
        const connection = this.connectionManager.createConnection();
        await connection.doOffer();
        return connection;
    }

    getConnection(id) {
        return this.connectionManager.getConnection(id);
    }

    getConnections() {
        return this.connectionManager.getConnections();
    }

    toJSON() {
        return this.getConnections().map(connection => connection.toJSON());
    }
}

module.exports = WebRtcConnectionManager;
