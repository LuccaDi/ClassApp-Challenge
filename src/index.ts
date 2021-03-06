import fs from "fs";
import lodash from "lodash";
import path from "path";
import { validate } from "email-validator";
import { PhoneNumber, PhoneNumberUtil } from "google-libphonenumber";
interface Addresses {
  type: string;
  tags: string[];
  address: string;
}

function formatPhone(value: PhoneNumber) {
  return `${value.getCountryCode()}${value.getNationalNumber()}`;
}

function verifyIsValidPhone(value: PhoneNumber): boolean {
  return PhoneNumberUtil.getInstance().isValidNumber(value);
}

function verifyIsValidEmail(value: string): boolean {
  return validate(value);
}

function formatBooleanData(value: any): Boolean {
  if (value == "yes") {
    value = true;
  } else if (value == "no") {
    value = false;
  } else if (value == 0) {
    value = false;
  } else if (value == 1) {
    value = true;
  }

  return Boolean(value);
}

function createAddress(header: string, property: string) {
  let addressHeader = header.split(" ");
  let addressType = addressHeader[0];

  addressHeader = lodash.drop(addressHeader);

  let addressTags = addressHeader;

  if (addressType == "phone") {
    //verifys if has any number on the data
    if (/\d/.test(property)) {
      let phone = PhoneNumberUtil.getInstance().parseAndKeepRawInput(
        property,
        "BR"
      );

      if (verifyIsValidPhone(phone)) {
        property = formatPhone(phone);
        return { type: addressType, tags: addressTags, address: property };
      } else {
        return null;
      }
    } else {
      return null;
    }
  } else if (addressType == "email") {
    let validEmail = "";
    let emails = property.split(" ");

    emails.map((value) => {
      if (verifyIsValidEmail(value)) {
        validEmail = value;
      }
    });

    if (validEmail != "") {
      return { type: addressType, tags: addressTags, address: validEmail };
    }
  }
  return null;
}

function verifyEqualHeaders(headers: string[], equalHeaders: string[]) {
  let differentHeaders: string[] = [];

  for (let i = 0; i < headers.length; i++) {
    let header = headers[i];

    header = header.replace(/\"/g, "");

    if (differentHeaders.indexOf(header) != -1) {
      let index = differentHeaders.indexOf(header);

      if (equalHeaders.indexOf(header) == -1) {
        equalHeaders.push(header);
      }
    } else {
      differentHeaders.push(header);
    }

    headers[i] = header;
  }
}

function main() {
  const file = fs.readFileSync(path.join(__dirname, "./input.csv"), "utf8");

  const input = file.toString().split("\n");

  let result = [];

  let headers = input[0].split(",");

  let duplicatedHeaders: string[] = [];

  //remove quotes, verify equal headers
  verifyEqualHeaders(headers, duplicatedHeaders);

  //go through the lines of the file, except for the header
  for (let i = 1; i < input.length; i++) {
    if (input[i] == "") {
      continue;
    }

    let existsObj = false;
    let indexResult: any;

    let obj: {
      [key: string]: any;
    } = {};

    let addresses: Addresses[] = [];

    let row = input[i];
    let addAddress;

    row = row
      .replace(/\,+(?=(?:(?:[^"]*"){2})*[^"]*"[^"]*$)/g, "/")
      .replace(/\"/g, "")
      .replace(/\,/g, "|");

    let rowFields = row.split("|");

    //go through each cell of each line of the file
    for (let idx in headers) {
      let data;

      //checks if person already exists
      if (headers[idx] == "eid") {
        result.map((value, index) => {
          if (rowFields[idx] == value[headers[idx]]) {
            obj = value;

            addresses = obj["addresses"];

            existsObj = true;
            indexResult = index;
          }
        });
      }

      //checks if the cell contains more than one data
      if (rowFields[idx].includes("/")) {
        //split the cell data
        data = rowFields[idx].split("/").map((item) => item.trim());

        //checks if the header contain tags, so is an address header
        if (headers[idx].includes(" ")) {
          data.map((item) => {
            //for each address data, creates a new address
            addAddress = createAddress(headers[idx], item);

            if (addAddress != null) {
              addresses.push(addAddress);
            }
          });
        }
        //checks if it is not an empty cell
      } else if (rowFields[idx] != "") {
        data = rowFields[idx].trim();

        //checks if the header contain tags, so it is an address header
        if (headers[idx].includes(" ")) {
          addAddress = createAddress(headers[idx], data);

          if (addAddress != null) {
            addresses.push(addAddress);
          }
        }
      }

      //checks if it is an address header or not
      if (!headers[idx].includes(" ")) {
        //checks if it is an header that repeats
        if (duplicatedHeaders.includes(headers[idx])) {
          //checks if the data contains more than one information
          if (typeof data == "object") {
            //for each information concatenates to the obejct that already exists
            data.map((value) => {
              if (!lodash.includes(obj[headers[idx] + "s"], value)) {
                obj[headers[idx] + "s"] = lodash.concat(
                  obj[headers[idx] + "s"],
                  value
                );
              }
            });
          } else {
            //concatenates the information to the object that already exists
            if (!lodash.includes(obj[headers[idx] + "s"], data)) {
              obj[headers[idx] + "s"] = lodash.concat(
                obj[headers[idx] + "s"],
                data
              );
            }
          }
        } else {
          //checks if it is one of the boolean data headers
          if (headers[idx] == "invisible" || headers[idx] == "see_all") {
            obj[headers[idx]] = formatBooleanData(data);
          } else {
            obj[headers[idx]] = data;
          }
        }
      } else {
        obj["addresses"] = addresses;
      }

      //removes any null or empty values from the object
      lodash.remove(obj[headers[idx]], (value) => {
        return value == null || value == "";
      });

      lodash.remove(obj[headers[idx] + "s"], (value) => {
        return value == null || value == "";
      });
    }

    //verifys if the object already exists on the result array
    if (existsObj) {
      result[indexResult] = obj;
    } else {
      result.push(obj);
    }

    existsObj = false;
  }

  let json = JSON.stringify(result, null, 2);

  fs.writeFileSync(path.join(__dirname, "./output.json"), json);
}

main();
