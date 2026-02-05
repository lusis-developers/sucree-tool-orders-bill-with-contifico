import type { Request, Response, NextFunction } from "express";
import { HttpStatusCode } from "axios";
import { models } from "../models";

export async function getDeliveryPersons(req: Request, res: Response, next: NextFunction) {
  try {
    const persons = await models.deliveryPersons.find({ active: true }).sort({ name: 1 });
    res.status(HttpStatusCode.Ok).send({
      message: "Delivery persons retrieved successfully.",
      data: persons
    });
    return;
  } catch (error) {
    console.error("❌ Error in getDeliveryPersons:", error);
    res.status(HttpStatusCode.InternalServerError).send({
      message: "Error fetching delivery persons.",
      error: error instanceof Error ? error.message : String(error)
    });
    return;
  }
}

export async function createDeliveryPerson(req: Request, res: Response, next: NextFunction) {
  try {
    const personData = req.body;

    if (!personData.name || !personData.identification) {
      res.status(HttpStatusCode.BadRequest).send({
        message: "Name and Identification are required."
      });
      return;
    }

    // Check if identification already exists
    const existing = await models.deliveryPersons.findOne({ identification: personData.identification });
    if (existing) {
      res.status(HttpStatusCode.Conflict).send({
        message: "A delivery person with this identification already exists."
      });
      return;
    }

    const newPerson = new models.deliveryPersons(personData);
    await newPerson.save();

    res.status(HttpStatusCode.Created).send({
      message: "Delivery person created successfully.",
      data: newPerson
    });
    return;
  } catch (error) {
    console.error("❌ Error in createDeliveryPerson:", error);
    res.status(HttpStatusCode.InternalServerError).send({
      message: "Error creating delivery person.",
      error: error instanceof Error ? error.message : String(error)
    });
    return;
  }
}

export async function updateDeliveryPerson(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const person = await models.deliveryPersons.findByIdAndUpdate(id, updateData, { new: true });
    if (!person) {
      res.status(HttpStatusCode.NotFound).send({ message: "Delivery person not found." });
      return;
    }

    res.status(HttpStatusCode.Ok).send({
      message: "Delivery person updated successfully.",
      data: person
    });
    return;
  } catch (error) {
    console.error("❌ Error in updateDeliveryPerson:", error);
    res.status(HttpStatusCode.InternalServerError).send({
      message: "Error updating delivery person.",
      error: error instanceof Error ? error.message : String(error)
    });
    return;
  }
}

export async function deleteDeliveryPerson(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const person = await models.deliveryPersons.findByIdAndDelete(id);
    if (!person) {
      res.status(HttpStatusCode.NotFound).send({ message: "Delivery person not found." });
      return;
    }

    res.status(HttpStatusCode.Ok).send({
      message: "Delivery person deleted successfully."
    });
    return;
  } catch (error) {
    console.error("❌ Error in deleteDeliveryPerson:", error);
    res.status(HttpStatusCode.InternalServerError).send({
      message: "Error deleting delivery person.",
      error: error instanceof Error ? error.message : String(error)
    });
    return;
  }
}
