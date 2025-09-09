import { Category } from '../models/category.model.js';
import type { Icategory } from '../interfaces/model.interface.js';
import { MSG, ERROR_MSG } from '../constants/messege.js';
import { statuscode } from '../constants/status.js';

export class CategoryService {
  async create(data: Icategory) {
    const exists = await Category.findOne({ name: data.name });
    if (exists) {
      return { statuscode: statuscode.CONFLICT, Content: { message: ERROR_MSG.EXISTS('Category') } };
    }
    const result = await Category.create({ name: data.name, description: data.description || '' });
    return { statuscode: statuscode.CREATED, Content: { message: MSG.SUCCESS('Category created'), data: result } };
  }

  async get(id?: string) {
    const data = id ? await Category.findById(id) : await Category.find();
    if (id && !data) return { statuscode: statuscode.NOTFOUND, Content: { message: ERROR_MSG.NOT_FOUND('Category') } };
    return { statuscode: statuscode.OK, Content: { message: MSG.SUCCESS('Category fetched'), data } };
  }

  async update(id: string, data: Partial<Icategory>) {
    const result = await Category.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!result) return { statuscode: statuscode.NOTFOUND, Content: { message: ERROR_MSG.NOT_FOUND('Category') } };
    return { statuscode: statuscode.OK, Content: { message: MSG.SUCCESS('Category updated'), data: result } };
  }

  async remove(id: string) {
    const result = await Category.findByIdAndDelete(id);
    if (!result) return { statuscode: statuscode.NOTFOUND, Content: { message: ERROR_MSG.NOT_FOUND('Category') } };
    return { statuscode: statuscode.OK, Content: { message: MSG.SUCCESS('Category deleted'), data: result } };
  }
}
