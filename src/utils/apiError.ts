import { ERROR_MSG } from '../constants/messege.js';

export class ApiError extends Error {
  statuscode: number;

  constructor(
    statuscode: number,
    message = ERROR_MSG.DEFAULT_ERROR
  ) {
    super(message);
    this.statuscode = statuscode;
    this.message = message;
  }
}