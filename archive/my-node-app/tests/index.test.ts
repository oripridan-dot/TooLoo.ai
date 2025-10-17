import { describe, it, expect } from 'jest';
import { IndexController } from '../src/controllers/index';
import { Service } from '../src/services/index';

describe('IndexController', () => {
    let controller: IndexController;
    let service: Service;

    beforeEach(() => {
        service = new Service();
        controller = new IndexController(service);
    });

    it('should create an instance of IndexController', () => {
        expect(controller).toBeInstanceOf(IndexController);
    });

    // Add more tests for the methods in IndexController
});